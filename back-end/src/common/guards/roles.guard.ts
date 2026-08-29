import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { bookings, supportTickets, trips, passengers } from '../../data';
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
    if (userRole === Role.ADMIN || userRole === Role.SUPERUSER) {
      return;
    }

    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const userId = this.getHeaderUserId(request.headers['x-user-id']);

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
        return;

      case 'SupportTicketsController':
        if (userRole === Role.TRAVELER) {
          this.enforceTravelerTicketOwnership(handlerName, request, userId);
        }
        if (userRole === Role.AGENCY) {
          this.enforceAgencyTicketOwnership(handlerName, request, userId);
        }
        return;

      case 'PaymentsController':
        if (userRole === Role.AGENCY && handlerName === 'findByAgency') {
          this.ensureParamMatchesUser(request.params?.agencyId, userId);
        }
        return;

      case 'RefundsController':
        if (userRole === Role.AGENCY && handlerName === 'findByAgency') {
          this.ensureParamMatchesUser(request.params?.agencyId, userId);
        }
        return;

      default:
        return;
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
