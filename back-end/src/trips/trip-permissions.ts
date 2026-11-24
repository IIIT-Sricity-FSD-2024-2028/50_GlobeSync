import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Trip, bookings } from '../data';

/**
 * Who is performing a trip change. `undefined` means an internal/system call
 * (unit tests, seeders, other services) which is not restricted here.
 */
export interface TripActor {
  role: string;
  userId: number;
}

const STAFF_ROLES = ['admin', 'superuser', 'support'];

/** A guide has 3 hours to accept or decline a trip request (owner rule, Nov 2026). */
export const GUIDE_RESPONSE_HOURS = 3;
export function guideRequestTimes(now = Date.now()) {
  return {
    guideRequestedAt: new Date(now).toISOString(),
    guideResponseDueAt: new Date(now + GUIDE_RESPONSE_HOURS * 3600 * 1000).toISOString(),
  };
}


/** Fields an owner (traveler/agency) may change while the trip is still being planned. */
const OWNER_PLANNING_FIELDS = [
  'title', 'origin', 'destination', 'startDate', 'endDate', 'budget', 'guideId', 'packageId',
  'passengerIds', 'transportDetails', 'itineraryDays', 'category', 'notes', 'travelersCount',
  'status', 'cancellationReason', 'cancelledAt', 'draftPlan',
];

/** Fields an owner may still change after the trip is confirmed (no price/date/guide changes). */
const OWNER_CONFIRMED_FIELDS = ['title', 'notes', 'category', 'itineraryDays', 'status', 'cancellationReason', 'cancelledAt'];

/** Fields the assigned guide may change. */
const GUIDE_FIELDS = ['guideStatus', 'guideDecisionReason', 'reason', 'notes', 'status'];

function changedKeys(current: Trip, dto: Record<string, any>): string[] {
  return Object.keys(dto).filter((k) => dto[k] !== undefined && (current as any)[k] !== dto[k]);
}

/**
 * Field-level authorisation for PUT/PATCH /trips/:id.
 * Object-level ownership (is this my trip?) is already enforced by the guard.
 */
export function assertTripUpdateAllowed(actor: TripActor | undefined, current: Trip, dto: Record<string, any>): void {
  if (!actor || STAFF_ROLES.includes(actor.role)) return;
  const changed = changedKeys(current, dto);

  if (actor.role === 'guide') {
    const notAllowed = changed.filter((k) => !GUIDE_FIELDS.includes(k));
    if (notAllowed.length) {
      throw new ForbiddenException(`Guides can only accept or decline a trip and update its progress. Not allowed: ${notAllowed.join(', ')}.`);
    }
    if (dto.guideStatus !== undefined && dto.guideStatus !== current.guideStatus) {
      if (current.guideStatus !== 'Pending') {
        throw new BadRequestException(`This request was already ${String(current.guideStatus || 'closed').toLowerCase()} and cannot be changed.`);
      }
      if (!['Accepted', 'Declined'].includes(dto.guideStatus)) {
        throw new BadRequestException('Guide decision must be Accepted or Declined.');
      }
      if (['Cancelled', 'Completed'].includes(current.status)) {
        throw new BadRequestException(`Trip is ${current.status.toLowerCase()} and can no longer be accepted or declined.`);
      }
      if (dto.guideStatus === 'Accepted' && current.guideResponseDueAt && Date.now() > Date.parse(current.guideResponseDueAt)) {
        throw new BadRequestException(
          `The ${GUIDE_RESPONSE_HOURS}-hour reply time for this request has passed. The traveler has been asked to choose again.`,
        );
      }
    }
    return;
  }

  // traveler / agency (owner)
  if (changed.includes('guideStatus') || changed.includes('guideDecisionReason')) {
    throw new ForbiddenException('Only the assigned guide can accept or decline a guide request.');
  }
  if (changed.includes('travelerId') || changed.includes('agencyId')) {
    throw new ForbiddenException('Trip ownership cannot be transferred.');
  }
  // The trip budget is fixed when the traveler plans/books the trip; it changes only
  // through bookings and payments, never by editing the trip (owner request, Nov 2026).
  // (While the trip is still a draft — status Planning, nothing booked — the plan's budget may still change.)
  if (actor.role === 'traveler' && changed.includes('budget') && current.status !== 'Planning') {
    throw new BadRequestException('The trip budget is set when the trip is booked and cannot be edited.');
  }
  // Once any booking of the trip is paid, the group size is fixed: no extra travelers can be added.
  if (changed.includes('travelersCount') || changed.includes('passengerIds')) {
    const paid = bookings.some(
      (b: any) => b.tripId === current.tripId && ['PAID', 'CONFIRMED', 'Confirmed', 'COMPLETED', 'Completed'].includes(String(b.status)),
    );
    if (paid) {
      throw new BadRequestException('Payment is already complete for this trip, so travelers cannot be added or removed.');
    }
  }
  const editable = current.status === 'Planning' ? OWNER_PLANNING_FIELDS : OWNER_CONFIRMED_FIELDS;
  const notAllowed = changed.filter((k) => !editable.includes(k) && k !== 'reason');
  if (notAllowed.length) {
    throw new BadRequestException(
      `Trip is ${current.status}. These details can no longer be changed: ${notAllowed.join(', ')}. Cancel and rebook, or contact support.`,
    );
  }
}

/**
 * Role rules for trip status changes (the transition table itself is checked separately).
 *  - Confirmed is set by the server when every booking of the trip is paid (or by staff/agency).
 *  - Active / Completed are set by the assigned guide (after accepting) or staff.
 *  - Cancelled is allowed for the owner; guides decline instead of cancelling.
 */
export function assertTripStatusChangeAllowed(actor: TripActor | undefined, current: Trip, target: string): void {
  if (!actor || STAFF_ROLES.includes(actor.role) || target === current.status) return;

  if (actor.role === 'guide') {
    if (!['Active', 'Completed'].includes(target)) {
      throw new ForbiddenException('Guides can only start (Active) or complete a trip. Decline the request instead of cancelling.');
    }
    if (current.guideStatus !== 'Accepted') {
      throw new BadRequestException('Accept the trip request before starting or completing it.');
    }
    return;
  }

  if (actor.role === 'traveler') {
    if (!['Pending', 'Cancelled'].includes(target)) {
      throw new ForbiddenException(
        target === 'Confirmed'
          ? 'A trip is confirmed automatically once all of its bookings are paid.'
          : 'Only the assigned guide can start or complete a trip.',
      );
    }
    return;
  }

  if (actor.role === 'agency') {
    if (['Active', 'Completed'].includes(target) && current.guideId && current.guideStatus !== 'Accepted') {
      throw new BadRequestException('The assigned guide has not accepted this trip yet.');
    }
  }
}

/** Statuses a traveler may create a trip in (agencies operate their own confirmed trips). */
export function assertTripCreateStatusAllowed(actor: TripActor | undefined, status: string): void {
  if (!actor || actor.role !== 'traveler') return;
  if (!['Planning', 'Pending'].includes(status)) {
    throw new ForbiddenException('New trips start as Planning or Pending. They are confirmed after payment.');
  }
}
