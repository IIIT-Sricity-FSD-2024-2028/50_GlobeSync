import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { bookings, supportTickets, trips, messages, passengers, itineraries, expenses, payments, refunds } from '../../data';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

const OWN_RESOURCE_ERROR =
  'Access denied. You can only access your own resources.';

/**
 * Guard that checks the x-user-role header against
 * the roles specified by the @Roles() decorator.
 * It also enforces basic ownership rules using x-user-id
 * for traveler and guide self-service routes.
 *
 * RBAC rules:
 * - If the route has no role metadata → allow access.
 * - If the route has role metadata → check x-user-role header.
 * - If role header is missing or not in the allowed list → 403 Forbidden.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from the @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, the route is public
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Read role from request header
    const request = context.switchToHttp().getRequest();
    const userRole = request.headers['x-user-role'] as string;

    if (!userRole) {
      throw new ForbiddenException(
        'Access denied. Missing x-user-role header.',
      );
    }

    const hasRole = requiredRoles.some((role) => role === userRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Role '${userRole}' is not authorized for this resource. Required: [${requiredRoles.join(', ')}]`,
      );
    }

    this.enforceOwnership(context, request, userRole as Role);

    return true;
  }

  private enforceOwnership(
    context: ExecutionContext,
    request: {
      headers: Record<string, string | string[] | undefined>;
      params?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
    },
    userRole: Role,
  ): void {
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const userId = this.getHeaderUserId(request.headers['x-user-id']);

    // AdminsController: self-scoped for both ADMIN and SUPERUSER.
    // This check MUST run before the privileged-role early-return below
    // because these profile endpoints are self-scoped even for privileged roles.
    if (controllerName === 'AdminsController') {
      if (['findOne', 'update'].includes(handlerName)) {
        this.ensureParamMatchesUser(request.params?.id, userId);
      }
      return;
    }

    // All other controllers: ADMIN and SUPERUSER bypass ownership checks.
    if (userRole === Role.ADMIN || userRole === Role.SUPERUSER) {
      return;
    }

    switch (controllerName) {
      case 'TravelersController':
        if (
          userRole === Role.TRAVELER &&
          ['findOne', 'update', 'remove'].includes(handlerName)
        ) {
          this.ensureParamMatchesUser(request.params?.id, userId);
        }
        return;

      case 'AgenciesController':
        if (
          userRole === Role.AGENCY &&
          ['findOne', 'update'].includes(handlerName)
        ) {
          this.ensureParamMatchesUser(request.params?.id, userId);
        }
        return;

      case 'GuidesController':
        if (userRole === Role.GUIDE && handlerName === 'update') {
          this.ensureParamMatchesUser(request.params?.id, userId);
        }
        return;

      case 'PassengersController':
        if (userRole === Role.TRAVELER) {
          this.enforceTravelerPassengerOwnership(handlerName, request, userId);
        }
        if (userRole === Role.AGENCY) {
          this.enforceAgencyPassengerOwnership(handlerName, request, userId);
        }
        return;

      case 'DashboardController':
        if (userRole === Role.TRAVELER && handlerName === 'getTravelerDashboard') {
          this.ensureParamMatchesUser(request.params?.travelerId, userId);
        }
        if (userRole === Role.GUIDE && handlerName === 'getGuideDashboard') {
          this.ensureParamMatchesUser(request.params?.guideId, userId);
        }
        if (userRole === Role.AGENCY && handlerName === 'getAgencyDashboard') {
          this.ensureParamMatchesUser(request.params?.agencyId, userId);
        }
        return;

      case 'TripsController':
        if (userRole === Role.TRAVELER) {
          this.enforceTravelerTripOwnership(handlerName, request, userId);
        }
        if (userRole === Role.GUIDE) {
          this.enforceGuideTripOwnership(handlerName, request, userId);
        }
        if (userRole === Role.AGENCY) {
          this.enforceAgencyTripOwnership(handlerName, request, userId);
        }
        return;

      case 'BookingsController':
        if (userRole === Role.TRAVELER) {
          this.enforceTravelerBookingOwnership(handlerName, request, userId);
        }
        if (userRole === Role.AGENCY) {
          this.enforceAgencyBookingOwnership(handlerName, request, userId);
        }
        if (userRole === Role.GUIDE && handlerName === 'findByGuide') {
          this.ensureParamMatchesUser(request.params?.guideId, userId);
        }
        return;

      case 'SupportTicketsController':
        if (userRole === Role.TRAVELER) {
          this.enforceTravelerTicketOwnership(handlerName, request, userId);
        }
        if (userRole === Role.AGENCY) {
          this.enforceAgencyTicketOwnership(handlerName, request, userId);
        }
        return;

      case 'ItinerariesController':
        if (userRole === Role.TRAVELER || userRole === Role.GUIDE || userRole === Role.AGENCY) {
          this.enforceTripChildOwnership(handlerName, request, userRole, userId, itineraries);
        }
        return;

      case 'ExpensesController':
        if (userRole === Role.TRAVELER || userRole === Role.GUIDE || userRole === Role.AGENCY) {
          this.enforceTripChildOwnership(handlerName, request, userRole, userId, expenses);
        }
        return;

      case 'PaymentsController':
        if (userRole === Role.TRAVELER) {
          this.enforceTravelerPaymentOwnership(handlerName, request, userId);
        }
        if (userRole === Role.AGENCY && handlerName === 'findByAgency') {
          this.ensureParamMatchesUser(request.params?.agencyId, userId);
        }
        return;

      case 'RefundsController':
        if (userRole === Role.TRAVELER) {
          this.enforceTravelerRefundOwnership(handlerName, request, userId);
        }
        if (userRole === Role.AGENCY && handlerName === 'findByAgency') {
          this.ensureParamMatchesUser(request.params?.agencyId, userId);
        }
        return;

      case 'SupportUsersController':
        if (
          userRole === Role.SUPPORT &&
          ['findOne', 'update'].includes(handlerName)
        ) {
          this.ensureParamMatchesUser(request.params?.id, userId);
        }
        return;

      case 'RevenueController':
        if (userRole === Role.AGENCY && handlerName === 'getAgencyRevenue') {
          this.ensureParamMatchesUser(request.params?.id, userId);
        }
        return;

      case 'SubscriptionsController':
        if (userRole === Role.AGENCY) {
          if (handlerName === 'getAgencySubscription') {
            this.ensureParamMatchesUser(request.params?.id, userId);
          }
          if (handlerName === 'subscribe') {
            this.ensureBodyAgencyMatchesUser(request.body, userId);
          }
        }
        return;

      case 'PromotionsController':
        if (userRole === Role.AGENCY && handlerName === 'createPromotion') {
          this.ensureBodyAgencyMatchesUser(request.body, userId);
        }
        return;

      case 'MessagesController':
        this.enforceMessageOwnership(handlerName, request, userRole, userId);
        return;

      case 'ReviewsController':
        if (userRole === Role.TRAVELER && handlerName === 'create') {
          this.enforceTravelerReviewOwnership(request, userId);
        }
        return;

      default:
        return;
    }
  }

  /**
   * Enforce ownership for trip-child resources (Itinerary, Expense)
   */
  private enforceTripChildOwnership(
    handlerName: string,
    request: { params?: Record<string, string | undefined>; body?: Record<string, unknown>; },
    userRole: Role,
    userId: number,
    collection: { tripId?: number; itineraryId?: number; expenseId?: number; }[]
  ): void {
    let tripId: number | undefined;

    if (handlerName === 'findByTrip') {
      tripId = this.parseNumericValue(request.params?.tripId);
    } else if (handlerName === 'create') {
      tripId = this.parseNumericValue(request.body?.tripId);
    } else if (['findOne', 'update', 'remove'].includes(handlerName)) {
      const itemId = this.parseNumericValue(request.params?.id);
      const item = collection.find(i => i.itineraryId === itemId || i.expenseId === itemId);
      if (!item) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
      tripId = item.tripId;
    }

    if (!tripId) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }

    const trip = trips.find(t => t.tripId === tripId);
    if (!trip) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }

    if (userRole === Role.TRAVELER && trip.travelerId !== userId) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
    if (userRole === Role.GUIDE && trip.guideId !== userId) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
    if (userRole === Role.AGENCY && trip.agencyId !== userId) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  /**
   * Enforce TRAVELER ownership for Payments
   */
  private enforceTravelerPaymentOwnership(
    handlerName: string,
    request: { params?: Record<string, string | undefined>; body?: Record<string, unknown>; },
    userId: number
  ): void {
    if (handlerName === 'findByBooking') {
      const bookingId = this.parseNumericValue(request.params?.bookingId);
      const booking = bookings.find(b => b.bookingId === bookingId);
      if (!booking || booking.travelerId !== userId) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
      return;
    }

    if (handlerName === 'create') {
      // Payment might have bookingId or tripId
      const bookingId = request.body?.bookingId ? this.parseNumericValue(request.body.bookingId) : undefined;
      const tripId = request.body?.tripId ? this.parseNumericValue(request.body.tripId) : undefined;
      
      this.verifyPaymentParentOwnership(bookingId, tripId, userId);
      return;
    }

    if (['findOne', 'update', 'remove'].includes(handlerName)) {
      const paymentId = this.parseNumericValue(request.params?.id);
      const payment = payments.find(p => p.paymentId === paymentId);
      if (!payment) throw new ForbiddenException(OWN_RESOURCE_ERROR);
      
      this.verifyPaymentParentOwnership(payment.bookingId, payment.tripId, userId);
      return;
    }
  }

  private verifyPaymentParentOwnership(bookingId: number | undefined, tripId: number | undefined, userId: number): void {
    if (bookingId) {
      const booking = bookings.find(b => b.bookingId === bookingId);
      if (!booking || booking.travelerId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    } else if (tripId) {
      const trip = trips.find(t => t.tripId === tripId);
      if (!trip || trip.travelerId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    } else {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  /**
   * Enforce TRAVELER ownership for Refunds
   */
  private enforceTravelerRefundOwnership(
    handlerName: string,
    request: { params?: Record<string, string | undefined>; body?: Record<string, unknown>; },
    userId: number
  ): void {
    if (handlerName === 'create') {
      const paymentId = this.parseNumericValue(request.body?.paymentId);
      const payment = payments.find(p => p.paymentId === paymentId);
      if (!payment) throw new ForbiddenException(OWN_RESOURCE_ERROR);
      
      this.verifyPaymentParentOwnership(payment.bookingId, payment.tripId, userId);
      return;
    }

    if (['findOne', 'updateStatus', 'remove'].includes(handlerName)) {
      const refundId = this.parseNumericValue(request.params?.id);
      const refund = refunds.find(r => r.refundId === refundId);
      if (!refund) throw new ForbiddenException(OWN_RESOURCE_ERROR);
      
      const payment = payments.find(p => p.paymentId === refund.paymentId);
      if (!payment) throw new ForbiddenException(OWN_RESOURCE_ERROR);

      this.verifyPaymentParentOwnership(payment.bookingId, payment.tripId, userId);
      return;
    }
  }

  /**
   * Enforce message ownership for non-admin roles.
   *
   * Role-to-type mapping: Role enum values are lowercase strings that
   * match the sender/receiver type strings used in CreateMessageDto.
   *
   * - findByUser:        :userType must equal userRole, :userId must equal x-user-id.
   * - findConversation:  caller must be either the sender or receiver participant.
   * - create:            body.sender must equal userRole, body.senderId must equal x-user-id.
   */
  private enforceMessageOwnership(
    handlerName: string,
    request: {
      params?: Record<string, string | undefined>;
      query?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
      headers: Record<string, string | string[] | undefined>;
    },
    userRole: Role,
    userId: number,
  ): void {
    // Derive the participant type string from the role enum value.
    // Role.TRAVELER === 'traveler', Role.GUIDE === 'guide', etc.
    const roleType = userRole as string;

    if (handlerName === 'findByUser') {
      // :userType must match caller's role type
      const paramType = request.params?.userType;
      if (paramType !== roleType) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
      // :userId must match x-user-id
      this.ensureParamMatchesUser(request.params?.userId, userId);
      return;
    }

    if (handlerName === 'findConversation') {
      // Caller must be one participant (sender or receiver)
      const query = (request as any).query as Record<string, string | undefined> | undefined;
      const senderType   = query?.senderType;
      const senderIdRaw  = query?.senderId;
      const receiverType = query?.receiverType;
      const receiverIdRaw = query?.receiverId;

      const isSender =
        senderType === roleType &&
        this.parseNumericValue(senderIdRaw) === userId;
      const isReceiver =
        receiverType === roleType &&
        this.parseNumericValue(receiverIdRaw) === userId;

      if (!isSender && !isReceiver) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
      return;
    }

    if (handlerName === 'create') {
      // body.sender must match caller's role type
      const bodySender = request.body?.sender as string | undefined;
      if (bodySender !== roleType) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
      // body.senderId must match x-user-id
      const senderId = this.parseNumericValue(request.body?.senderId);
      if (senderId !== userId) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
    }
  }

  /**
   * Enforce TRAVELER ownership for review creation.
   * Checks:
   *  1. body.travelerId must equal x-user-id.
   *  2. The referenced trip (by body.tripId) must belong to that traveler.
   */
  private enforceTravelerReviewOwnership(
    request: { body?: Record<string, unknown> },
    userId: number,
  ): void {
    // 1. body.travelerId must equal x-user-id
    const travelerId = this.parseNumericValue(request.body?.travelerId);
    if (travelerId !== userId) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }

    // 2. The referenced trip must belong to this traveler
    const tripId = this.parseNumericValue(request.body?.tripId);
    const trip = trips.find((t) => t.tripId === tripId);
    if (!trip || trip.travelerId !== userId) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private enforceTravelerTripOwnership(
    handlerName: string,
    request: {
      params?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
    },
    userId: number,
  ): void {
    if (handlerName === 'findByTraveler') {
      this.ensureParamMatchesUser(request.params?.travelerId, userId);
      return;
    }

    if (handlerName === 'create') {
      this.ensureBodyTravelerMatchesUser(request.body, userId);
      return;
    }

    if (['findOne', 'update', 'updateStatus'].includes(handlerName)) {
      const tripId = this.parseNumericValue(request.params?.id);
      const trip = trips.find((item) => item.tripId === tripId);

      if (!trip || trip.travelerId !== userId) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
    }
  }

  private enforceAgencyTripOwnership(
    handlerName: string,
    request: {
      params?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
    },
    userId: number,
  ): void {
    if (handlerName === 'findByAgency') {
      this.ensureParamMatchesUser(request.params?.agencyId, userId);
      return;
    }

    if (handlerName === 'create') {
      this.ensureBodyAgencyMatchesUser(request.body, userId);
      return;
    }

    if (['findOne', 'update', 'updateStatus'].includes(handlerName)) {
      const tripId = this.parseNumericValue(request.params?.id);
      const trip = trips.find((item) => item.tripId === tripId);

      if (!trip || trip.agencyId !== userId) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
    }
  }

  private enforceGuideTripOwnership(
    handlerName: string,
    request: {
      params?: Record<string, string | undefined>;
    },
    userId: number,
  ): void {
    if (handlerName === 'findByGuide') {
      this.ensureParamMatchesUser(request.params?.guideId, userId);
      return;
    }

    if (['findOne', 'update', 'updateStatus'].includes(handlerName)) {
      const tripId = this.parseNumericValue(request.params?.id);
      const trip = trips.find((item) => item.tripId === tripId);

      if (!trip || trip.guideId !== userId) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
    }
  }

  private enforceTravelerBookingOwnership(
    handlerName: string,
    request: {
      params?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
    },
    userId: number,
  ): void {
    if (handlerName === 'findByTraveler') {
      this.ensureParamMatchesUser(request.params?.travelerId, userId);
      return;
    }

    if (handlerName === 'create') {
      this.ensureBodyTravelerMatchesUser(request.body, userId);
      return;
    }

    if (['findOne', 'update'].includes(handlerName)) {
      const bookingId = this.parseNumericValue(request.params?.id);
      const booking = bookings.find((item) => item.bookingId === bookingId);

      if (!booking || booking.travelerId !== userId) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
    }
  }

  private enforceAgencyBookingOwnership(
    handlerName: string,
    request: {
      params?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
    },
    userId: number,
  ): void {
    if (handlerName === 'findByAgency') {
      this.ensureParamMatchesUser(request.params?.agencyId, userId);
      return;
    }

    if (handlerName === 'create') {
      this.ensureBodyAgencyMatchesUser(request.body, userId);
      return;
    }

    if (['findOne', 'update'].includes(handlerName)) {
      const bookingId = this.parseNumericValue(request.params?.id);
      const booking = bookings.find((item) => item.bookingId === bookingId);

      if (!booking || booking.agencyId !== userId) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
    }
  }

  private enforceTravelerTicketOwnership(
    handlerName: string,
    request: {
      params?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
    },
    userId: number,
  ): void {
    if (handlerName === 'findByTraveler') {
      this.ensureParamMatchesUser(request.params?.travelerId, userId);
      return;
    }

    if (handlerName === 'create') {
      this.ensureBodyTravelerMatchesUser(request.body, userId);
      return;
    }

    if (handlerName === 'findOne') {
      const ticketId = this.parseNumericValue(request.params?.id);
      const ticket = supportTickets.find((item) => item.ticketId === ticketId);

      if (!ticket || ticket.travelerId !== userId) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
    }
  }

  private enforceAgencyTicketOwnership(
    handlerName: string,
    request: {
      params?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
    },
    userId: number,
  ): void {
    if (handlerName === 'findByAgency') {
      this.ensureParamMatchesUser(request.params?.agencyId, userId);
      return;
    }

    if (handlerName === 'create') {
      this.ensureBodyAgencyMatchesUser(request.body, userId);
      return;
    }

    if (handlerName === 'findOne') {
      const ticketId = this.parseNumericValue(request.params?.id);
      const ticket = supportTickets.find((item) => item.ticketId === ticketId);

      if (!ticket || ticket.agencyId !== userId) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
    }
  }

  private enforceTravelerPassengerOwnership(
    handlerName: string,
    request: { params?: Record<string, string | undefined>; body?: Record<string, unknown>; },
    userId: number,
  ): void {
    if (handlerName === 'findByTraveler') {
      this.ensureParamMatchesUser(request.params?.travelerId, userId);
      return;
    }
    if (handlerName === 'create') {
      this.ensureBodyTravelerMatchesUser(request.body, userId);
      return;
    }
    if (['findOne', 'update', 'remove'].includes(handlerName)) {
      const passId = this.parseNumericValue(request.params?.id);
      const pass = passengers.find((item) => item.passId === passId);
      if (!pass || pass.travelerId !== userId) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
    }
  }

  private enforceAgencyPassengerOwnership(
    handlerName: string,
    request: { params?: Record<string, string | undefined>; body?: Record<string, unknown>; },
    userId: number,
  ): void {
    if (handlerName === 'findByAgency') {
      this.ensureParamMatchesUser(request.params?.agencyId, userId);
      return;
    }
    if (handlerName === 'create') {
      this.ensureBodyAgencyMatchesUser(request.body, userId);
      return;
    }
    if (['findOne', 'update', 'remove'].includes(handlerName)) {
      const passId = this.parseNumericValue(request.params?.id);
      const pass = passengers.find((item) => item.passId === passId);
      if (!pass || pass.agencyId !== userId) {
        throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
    }
  }

  private ensureBodyTravelerMatchesUser(
    body: Record<string, unknown> | undefined,
    userId: number,
  ): void {
    const travelerId = this.parseNumericValue(body?.travelerId);
    if (travelerId !== userId) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private ensureBodyAgencyMatchesUser(
    body: Record<string, unknown> | undefined,
    userId: number,
  ): void {
    const agencyId = this.parseNumericValue(body?.agencyId);
    if (agencyId !== userId) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private ensureParamMatchesUser(
    rawParamValue: string | undefined,
    userId: number,
  ): void {
    const resourceId = this.parseNumericValue(rawParamValue);
    if (resourceId !== userId) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private getHeaderUserId(
    rawHeaderValue: string | string[] | undefined,
  ): number {
    const headerValue = Array.isArray(rawHeaderValue)
      ? rawHeaderValue[0]
      : rawHeaderValue;

    if (!headerValue) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }

    return this.parseNumericValue(headerValue);
  }

  private parseNumericValue(value: unknown): number {
    const parsed =
      typeof value === 'number'
        ? value
        : Number.parseInt(String(value ?? ''), 10);

    if (!Number.isInteger(parsed)) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }

    return parsed;
  }
}
