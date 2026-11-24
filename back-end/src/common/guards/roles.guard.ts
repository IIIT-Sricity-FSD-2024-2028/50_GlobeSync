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
 * LEGACY RolesGuard — used ONLY by the existing test specs (roles-guard-ownership.spec.ts,
 * child-resource-ownership.spec.ts) which mock x-user-role / x-user-id headers.
 *
 * In production, this guard is NO LONGER registered globally (removed from main.ts).
 * Instead, routes use @UseGuards(JwtAuthGuard, RolesGuard) from auth/guards/ which reads
 * role from the verified JWT payload (request.user.role).
 *
 * This file is kept at its original path so the existing spec files continue to compile.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Check JWT user first (production path), then x-user-role header (test/legacy path)
    let userRole: string | undefined;
    let userId: number | undefined;

    if (request.user?.role) {
      // Production: role from JWT
      userRole = request.user.role;
      userId = parseInt(request.user.userId, 10);
    } else if (process.env.NODE_ENV === 'test') {
      // Unit-test specs only: role from x-user-role header. Over HTTP the global
      // JWT guard always sets request.user first, and client headers are never trusted.
      userRole = request.headers['x-user-role'] as string | undefined;
      userId = this.getHeaderUserId(request.headers['x-user-id']);
    }

    if (!userRole) {
      throw new ForbiddenException('Access denied. No role found.');
    }

    const hasRole = requiredRoles.some((role) => role === userRole);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Role '${userRole}' is not authorized for this resource. Required: [${requiredRoles.join(', ')}]`,
      );
    }

    if (userId !== undefined && !isNaN(userId)) {
      this.enforceOwnership(context, request, userRole as Role, userId);
    }

    return true;
  }

  private enforceOwnership(
    context: ExecutionContext,
    request: {
      headers?: Record<string, string | string[] | undefined>;
      params?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
      user?: { userId?: string | number };
    },
    userRole: Role,
    explicitUserId?: number,
  ): void {
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const userId = explicitUserId ?? (request.user?.userId ? this.parseNumericValue(request.user.userId) : this.getHeaderUserId(request.headers?.['x-user-id']));

    if (controllerName === 'AdminsController') {
      if (['findOne', 'update'].includes(handlerName)) {
        this.ensureParamMatchesUser(request.params?.id, userId);
      }
      return;
    }

    if (userRole === Role.ADMIN || userRole === Role.SUPERUSER) {
      return;
    }

    switch (controllerName) {
      case 'TravelersController':
        if (userRole === Role.TRAVELER && ['findOne', 'update', 'remove'].includes(handlerName)) {
          this.ensureParamMatchesUser(request.params?.id, userId);
        }
        return;
      case 'AgenciesController':
        if (userRole === Role.AGENCY && ['findOne', 'update'].includes(handlerName)) {
          this.ensureParamMatchesUser(request.params?.id, userId);
        }
        return;
      case 'GuidesController':
        if (userRole === Role.GUIDE && handlerName === 'update') {
          this.ensureParamMatchesUser(request.params?.id, userId);
        }
        return;
      case 'PassengersController':
        if (userRole === Role.TRAVELER) this.enforceTravelerPassengerOwnership(handlerName, request, userId);
        if (userRole === Role.AGENCY) this.enforceAgencyPassengerOwnership(handlerName, request, userId);
        return;
      case 'DashboardController':
        if (userRole === Role.TRAVELER && handlerName === 'getTravelerDashboard') this.ensureParamMatchesUser(request.params?.travelerId, userId);
        if (userRole === Role.GUIDE && handlerName === 'getGuideDashboard') this.ensureParamMatchesUser(request.params?.guideId, userId);
        if (userRole === Role.AGENCY && handlerName === 'getAgencyDashboard') this.ensureParamMatchesUser(request.params?.agencyId, userId);
        return;
      case 'TripsController':
        if (userRole === Role.TRAVELER) this.enforceTravelerTripOwnership(handlerName, request, userId);
        if (userRole === Role.GUIDE) this.enforceGuideTripOwnership(handlerName, request, userId);
        if (userRole === Role.AGENCY) this.enforceAgencyTripOwnership(handlerName, request, userId);
        return;
      case 'BookingsController':
        if (userRole === Role.TRAVELER) this.enforceTravelerBookingOwnership(handlerName, request, userId);
        if (userRole === Role.AGENCY) this.enforceAgencyBookingOwnership(handlerName, request, userId);
        if (userRole === Role.GUIDE && handlerName === 'findByGuide') this.ensureParamMatchesUser(request.params?.guideId, userId);
        return;
      case 'SupportTicketsController':
        if (userRole === Role.TRAVELER) this.enforceTravelerTicketOwnership(handlerName, request, userId);
        if (userRole === Role.AGENCY) this.enforceAgencyTicketOwnership(handlerName, request, userId);
        return;
      case 'ItinerariesController':
        if ([Role.TRAVELER, Role.GUIDE, Role.AGENCY].includes(userRole)) this.enforceTripChildOwnership(handlerName, request, userRole, userId, itineraries);
        return;
      case 'ExpensesController':
        if ([Role.TRAVELER, Role.GUIDE, Role.AGENCY].includes(userRole)) this.enforceTripChildOwnership(handlerName, request, userRole, userId, expenses);
        return;
      case 'PaymentsController':
        if (userRole === Role.TRAVELER) this.enforceTravelerPaymentOwnership(handlerName, request, userId);
        if (userRole === Role.AGENCY && handlerName === 'findByAgency') this.ensureParamMatchesUser(request.params?.agencyId, userId);
        return;
      case 'RefundsController':
        if (userRole === Role.TRAVELER) this.enforceTravelerRefundOwnership(handlerName, request, userId);
        if (userRole === Role.AGENCY && handlerName === 'findByAgency') this.ensureParamMatchesUser(request.params?.agencyId, userId);
        return;
      case 'SupportUsersController':
        if (userRole === Role.SUPPORT && ['findOne', 'update'].includes(handlerName)) this.ensureParamMatchesUser(request.params?.id, userId);
        return;
      case 'RevenueController':
        if (userRole === Role.AGENCY && handlerName === 'getAgencyRevenue') this.ensureParamMatchesUser(request.params?.id, userId);
        return;
      case 'SubscriptionsController':
        if (userRole === Role.AGENCY) {
          if (handlerName === 'getAgencySubscription') this.ensureParamMatchesUser(request.params?.id, userId);
          if (handlerName === 'subscribe') this.ensureBodyAgencyMatchesUser(request.body, userId);
        }
        return;
      case 'PromotionsController':
        if (userRole === Role.AGENCY && handlerName === 'createPromotion') this.ensureBodyAgencyMatchesUser(request.body, userId);
        return;
      case 'MessagesController':
        this.enforceMessageOwnership(handlerName, request, userRole, userId);
        return;
      case 'ReviewsController':
        if (userRole === Role.TRAVELER && handlerName === 'create') this.enforceTravelerReviewOwnership(request, userId);
        return;
      default:
        return;
    }
  }

  private enforceTripChildOwnership(handlerName: string, request: any, userRole: Role, userId: number, collection: any[]): void {
    let tripId: number | undefined;
    if (['findByTrip', 'getBudgetGauge'].includes(handlerName)) {
      tripId = this.parseNumericValue(request.params?.tripId);
    } else if (handlerName === 'create') {
      tripId = this.parseNumericValue(request.body?.tripId);
    } else if (['findOne', 'update', 'remove'].includes(handlerName)) {
      const itemId = this.parseNumericValue(request.params?.id);
      let item = collection.find((i: any) => i.itineraryId === itemId || i.expenseId === itemId);
      if (!item && itemId >= 100000) {
        const b = bookings.find((b: any) => b.bookingId === itemId - 100000);
        if (b) {
          item = { tripId: b.tripId };
        }
      }
      if (!item) throw new ForbiddenException(OWN_RESOURCE_ERROR);
      tripId = item.tripId;
    }
    if (!tripId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    const trip = trips.find(t => t.tripId === tripId);
    if (!trip) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    if (userRole === Role.TRAVELER && trip.travelerId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    if (userRole === Role.GUIDE && trip.guideId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    if (userRole === Role.AGENCY && trip.agencyId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
  }

  private enforceTravelerPaymentOwnership(handlerName: string, request: any, userId: number): void {
    if (handlerName === 'findByBooking') {
      const bookingId = this.parseNumericValue(request.params?.bookingId);
      const booking = bookings.find(b => b.bookingId === bookingId);
      if (!booking || booking.travelerId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
      return;
    }
    if (handlerName === 'create') {
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

  private enforceTravelerRefundOwnership(handlerName: string, request: any, userId: number): void {
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
    }
  }

  private enforceMessageOwnership(handlerName: string, request: any, userRole: Role, userId: number): void {
    const roleType = userRole as string;
    if (handlerName === 'findByUser') {
      if (request.params?.userType !== roleType) throw new ForbiddenException(OWN_RESOURCE_ERROR);
      if (roleType !== 'support') {
        this.ensureParamMatchesUser(request.params?.userId, userId);
      }
      return;
    }
    if (handlerName === 'findConversation') {
      const query = request.query as Record<string, string | undefined> | undefined;
      const sType = query?.sender || query?.senderType;
      const rType = query?.receiver || query?.receiverType;
      const sId = this.parseNumericValue(query?.senderId);
      const rId = this.parseNumericValue(query?.receiverId);
      const isSender = sType === roleType && (roleType === 'support' || sId === userId);
      const isReceiver = rType === roleType && (roleType === 'support' || rId === userId);
      if (!isSender && !isReceiver) throw new ForbiddenException(OWN_RESOURCE_ERROR);
      return;
    }
    if (handlerName === 'create') {
      if (request.body?.sender !== roleType) throw new ForbiddenException(OWN_RESOURCE_ERROR);
      if (roleType !== 'support') {
        if (this.parseNumericValue(request.body?.senderId) !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
    }
  }

  private enforceTravelerReviewOwnership(request: any, userId: number): void {
    const travelerId = this.parseNumericValue(request.body?.travelerId);
    if (travelerId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    const tripId = this.parseNumericValue(request.body?.tripId);
    const trip = trips.find(t => t.tripId === tripId);
    if (!trip || trip.travelerId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
  }

  private enforceTravelerTripOwnership(handlerName: string, request: any, userId: number): void {
    if (handlerName === 'findByTraveler') { this.ensureParamMatchesUser(request.params?.travelerId, userId); return; }
    if (handlerName === 'create') { this.ensureBodyTravelerMatchesUser(request.body, userId); return; }
    if (['findOne', 'update', 'patch', 'updateStatus'].includes(handlerName)) {
      const trip = trips.find(item => item.tripId === this.parseNumericValue(request.params?.id));
      if (!trip || trip.travelerId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private enforceAgencyTripOwnership(handlerName: string, request: any, userId: number): void {
    if (handlerName === 'findByAgency') { this.ensureParamMatchesUser(request.params?.agencyId, userId); return; }
    if (handlerName === 'create') { this.ensureBodyAgencyMatchesUser(request.body, userId); return; }
    if (['findOne', 'update', 'patch', 'updateStatus'].includes(handlerName)) {
      const trip = trips.find(item => item.tripId === this.parseNumericValue(request.params?.id));
      if (!trip || trip.agencyId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private enforceGuideTripOwnership(handlerName: string, request: any, userId: number): void {
    if (handlerName === 'findByGuide') { this.ensureParamMatchesUser(request.params?.guideId, userId); return; }
    if (['findOne', 'update', 'patch', 'updateStatus'].includes(handlerName)) {
      const trip = trips.find(item => item.tripId === this.parseNumericValue(request.params?.id));
      if (!trip || trip.guideId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private enforceTravelerBookingOwnership(handlerName: string, request: any, userId: number): void {
    if (handlerName === 'findByTraveler') { this.ensureParamMatchesUser(request.params?.travelerId, userId); return; }
    if (handlerName === 'create') {
      this.ensureBodyTravelerMatchesUser(request.body, userId);
      // A booking can only be attached to one of the caller's own trips.
      if (request.body?.tripId !== undefined && request.body?.tripId !== null) {
        const trip = trips.find(t => t.tripId === this.parseNumericValue(request.body.tripId));
        if (!trip || trip.travelerId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
      return;
    }
    if (['findOne', 'update', 'cancel', 'cancellationPreview'].includes(handlerName)) {
      const booking = bookings.find(item => item.bookingId === this.parseNumericValue(request.params?.id));
      if (!booking || booking.travelerId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private enforceAgencyBookingOwnership(handlerName: string, request: any, userId: number): void {
    if (handlerName === 'findByAgency') { this.ensureParamMatchesUser(request.params?.agencyId, userId); return; }
    if (handlerName === 'create') {
      this.ensureBodyAgencyMatchesUser(request.body, userId);
      if (request.body?.tripId !== undefined && request.body?.tripId !== null) {
        const trip = trips.find(t => t.tripId === this.parseNumericValue(request.body.tripId));
        if (!trip || trip.agencyId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
      }
      return;
    }
    if (['findOne', 'update', 'cancel', 'cancellationPreview'].includes(handlerName)) {
      const booking = bookings.find(item => item.bookingId === this.parseNumericValue(request.params?.id));
      if (!booking || booking.agencyId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private enforceTravelerTicketOwnership(handlerName: string, request: any, userId: number): void {
    if (handlerName === 'findByTraveler') { this.ensureParamMatchesUser(request.params?.travelerId, userId); return; }
    if (handlerName === 'create') { this.ensureBodyTravelerMatchesUser(request.body, userId); return; }
    if (['findOne', 'addReply'].includes(handlerName)) {
      const ticket = supportTickets.find(item => item.ticketId === this.parseNumericValue(request.params?.id));
      if (!ticket || ticket.travelerId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private enforceAgencyTicketOwnership(handlerName: string, request: any, userId: number): void {
    if (handlerName === 'findByAgency') { this.ensureParamMatchesUser(request.params?.agencyId, userId); return; }
    if (handlerName === 'create') { this.ensureBodyAgencyMatchesUser(request.body, userId); return; }
    if (['findOne', 'addReply'].includes(handlerName)) {
      const ticket = supportTickets.find(item => item.ticketId === this.parseNumericValue(request.params?.id));
      if (!ticket || ticket.agencyId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private enforceTravelerPassengerOwnership(handlerName: string, request: any, userId: number): void {
    if (handlerName === 'findByTraveler') { this.ensureParamMatchesUser(request.params?.travelerId, userId); return; }
    if (handlerName === 'create') { this.ensureBodyTravelerMatchesUser(request.body, userId); return; }
    if (['findOne', 'update', 'remove'].includes(handlerName)) {
      const pass = passengers.find(item => item.passId === this.parseNumericValue(request.params?.id));
      if (!pass || pass.travelerId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private enforceAgencyPassengerOwnership(handlerName: string, request: any, userId: number): void {
    if (handlerName === 'findByAgency') { this.ensureParamMatchesUser(request.params?.agencyId, userId); return; }
    if (handlerName === 'create') { this.ensureBodyAgencyMatchesUser(request.body, userId); return; }
    if (['findOne', 'update', 'remove'].includes(handlerName)) {
      const pass = passengers.find(item => item.passId === this.parseNumericValue(request.params?.id));
      if (!pass || pass.agencyId !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }

  private ensureBodyTravelerMatchesUser(body: Record<string, unknown> | undefined, userId: number): void {
    if (this.parseNumericValue(body?.travelerId) !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
  }

  private ensureBodyAgencyMatchesUser(body: Record<string, unknown> | undefined, userId: number): void {
    if (this.parseNumericValue(body?.agencyId) !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
  }

  private ensureParamMatchesUser(rawParamValue: string | undefined, userId: number): void {
    if (this.parseNumericValue(rawParamValue) !== userId) throw new ForbiddenException(OWN_RESOURCE_ERROR);
  }

  private getHeaderUserId(rawHeaderValue: string | string[] | undefined): number {
    const headerValue = Array.isArray(rawHeaderValue) ? rawHeaderValue[0] : rawHeaderValue;
    if (!headerValue) return NaN;
    return this.parseNumericValue(headerValue);
  }

  private parseNumericValue(value: unknown): number {
    const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
    if (!Number.isInteger(parsed)) throw new ForbiddenException(OWN_RESOURCE_ERROR);
    return parsed;
  }
}
