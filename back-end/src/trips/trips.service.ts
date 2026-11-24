import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import {
  trips, Trip,
  commissionLedger,
  agencies,
  payments,
  bookings,
  itineraries,
  expenses,
} from '../data';
import { CreateTripDto, UpdateTripDto } from './dto';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GuideAvailabilityService } from '../guides/guide-availability.service';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';
import { packages, guides } from '../data';
import { PolicyService } from '../policy/policy.service';
import {
  TripActor,
  assertTripUpdateAllowed,
  assertTripStatusChangeAllowed,
  assertTripCreateStatusAllowed,
  guideRequestTimes,
} from './trip-permissions';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

/** Reject malformed or impossible calendar dates (e.g. 'zzz', '2026-02-30'). */
function assertValidDate(label: string, value?: string): void {
  if (value === undefined) return;
  const d = new Date(value);
  if (!ISO_DATE.test(String(value)) || isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== String(value).slice(0, 10)) {
    throw new BadRequestException(`${label} must be a valid date in YYYY-MM-DD format.`);
  }
}

/** Today's date in India (the platform's operating timezone), as YYYY-MM-DD. */
function todayInIndia(): string {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}


/**
 * Allowed trip status transitions.
 *
 * Planning  → Pending | Cancelled
 * Pending   → Confirmed | Cancelled
 * Confirmed → Active | Cancelled
 * Active    → Completed | Cancelled
 * Completed → (terminal)
 * Cancelled → (terminal)
 */
const TRIP_STATUS_TRANSITIONS: Record<string, string[]> = {
  Planning:  ['Pending', 'Cancelled'],
  Pending:   ['Confirmed', 'Cancelled'],
  Confirmed: ['Active', 'Cancelled'],
  Active:    ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

function normalizeStatus(status?: string): string | undefined {
  if (!status) return undefined;
  const s = status.trim().toLowerCase();
  if (s === 'planning' || s === 'planned') return 'Planning';
  if (s === 'pending') return 'Pending';
  if (s === 'confirmed' || s === 'paid') return 'Confirmed';
  if (s === 'active') return 'Active';
  if (s === 'completed') return 'Completed';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  return status;
}

/**
 * Validate that a status transition is allowed.
 * Returns a readable error message if invalid, or null if valid.
 */
function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
): string | null {
  if (currentStatus === newStatus) {
    return null; // idempotent — same status is always accepted
  }
  const allowed = TRIP_STATUS_TRANSITIONS[currentStatus];
  if (!allowed) {
    return `Unknown current status '${currentStatus}'.`;
  }
  if (!allowed.includes(newStatus)) {
    return (
      `Invalid status transition from '${currentStatus}' to '${newStatus}'. ` +
      `Allowed transitions from '${currentStatus}': [${allowed.join(', ')}].`
    );
  }
  return null;
}

/**
 * Calculates cancellation refund tier and enforces the 12-hour cancellation deadline:
 * - Cancelling within 12 hours of departure (<12 hrs): Cancellation not permitted. Throws BadRequestException.
 * - Cancelling between 12 hours and 3 days (12 to <72 hrs): Permitted, but 0% refund (can cancel, but no refund).
 * - Cancelling before 3 days (>= 72 hrs / >= 3 days): Permitted, 65% of the trip amount refunded (35% deduction).
 */
function calculateCancellationRefund(startDate?: string, budget?: number): { refundPercentage: number; refundAmount: number } {
  let refundPercentage = 65;
  let refundAmount = Math.round(Number(budget || 0) * 0.65);

  if (startDate) {
    const now = new Date();
    const tripStart = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00`);
    const diffMs = tripStart.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // 12-hour deadline cutoff rule:
    if (diffHours < 12) {
      throw new BadRequestException(
        'Trips cannot be cancelled within 12 hours of departure. The cancellation deadline has passed (cancellations are only permitted up to 12 hours prior to departure). Please contact 24/7 Support for emergency assistance.',
      );
    }

    // Cancellation refund policy:
    // - Cancel before 3 days (diffHours >= 72): 65% refund
    // - Cancel between 12 hours and 3 days (12 <= diffHours < 72): 0% refund (he can cancel, but no refund)
    if (diffHours >= 72) {
      refundPercentage = 65;
      refundAmount = Math.round(Number(budget || 0) * 0.65);
    } else {
      refundPercentage = 0;
      refundAmount = 0;
    }
  }

  return { refundPercentage, refundAmount };
}

@Injectable()
export class TripsService {
  constructor(
    @Optional() private readonly realtimeService?: RealtimeService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly guideAvailabilityService?: GuideAvailabilityService,
    @Optional() private readonly policyService?: PolicyService,
  ) {}

  findAll(): Trip[];
  findAll(query: PaginationQueryDto): Trip[] | PaginatedResult<Trip>;
  findAll(query?: PaginationQueryDto): any {
    return paginateCollection(trips, query, ['destination', 'title', 'origin']);
  }

  findOne(id: number): Trip {
    const trip = trips.find((t) => t.tripId === id);
    if (!trip) throw new NotFoundException(`Trip with ID ${id} not found`);
    return trip;
  }

  findByTraveler(travelerId: number): Trip[];
  findByTraveler(travelerId: number, query: PaginationQueryDto): Trip[] | PaginatedResult<Trip>;
  findByTraveler(travelerId: number, query?: PaginationQueryDto): any {
    const list = trips.filter((t) => t.travelerId === travelerId);
    return paginateCollection(list, query, ['destination', 'title', 'origin']);
  }

  findByGuide(guideId: number): Trip[];
  findByGuide(guideId: number, query: PaginationQueryDto): Trip[] | PaginatedResult<Trip>;
  findByGuide(guideId: number, query?: PaginationQueryDto): any {
    const list = trips.filter((t) => t.guideId === guideId);
    return paginateCollection(list, query, ['destination', 'title', 'origin']);
  }

  findByAgency(agencyId: number): Trip[];
  findByAgency(agencyId: number, query: PaginationQueryDto): Trip[] | PaginatedResult<Trip>;
  findByAgency(agencyId: number, query?: PaginationQueryDto): any {
    const list = trips.filter((t) => t.agencyId === agencyId);
    return paginateCollection(list, query, ['destination', 'title', 'origin']);
  }

  create(dto: CreateTripDto, actor?: TripActor): Trip {
    if (!!dto.travelerId === !!dto.agencyId) {
      throw new BadRequestException('Exactly one of travelerId or agencyId must be provided.');
    }

    assertValidDate('Start date', dto.startDate);
    assertValidDate('End date', dto.endDate);
    if (dto.startDate && dto.endDate && dto.endDate <= dto.startDate) {
      throw new BadRequestException('Trip end date must be strictly after the start date.');
    }
    if (dto.travelersCount !== undefined && (!Number.isInteger(dto.travelersCount) || dto.travelersCount < 1)) {
      throw new BadRequestException('Number of travelers must be a whole number of at least 1.');
    }
    if (dto.travelersCount !== undefined && dto.travelersCount > 50) {
      throw new BadRequestException('A single trip can include at most 50 travelers. Contact support for group bookings.');
    }
    if (dto.packageId !== undefined && dto.packageId !== null) {
      const pkg = packages.find((p) => p.packageId === dto.packageId);
      if (!pkg) throw new BadRequestException(`Package #${dto.packageId} does not exist.`);
      const UNAVAILABLE = ['INACTIVE', 'ARCHIVED', 'DRAFT', 'DEACTIVATED', 'DISABLED', 'UNPUBLISHED'];
      if (pkg.status && UNAVAILABLE.includes(String(pkg.status).toUpperCase())) {
        throw new BadRequestException(`Package "${pkg.name}" is not currently available for booking.`);
      }
    }
    if (dto.guideId !== undefined && dto.guideId !== null && !guides.some((g) => g.guideId === dto.guideId)) {
      throw new BadRequestException(`Guide #${dto.guideId} does not exist.`);
    }
    assertTripCreateStatusAllowed(actor, normalizeStatus(dto.status) || 'Planning');

    // Advance booking validation: Trips cannot be booked for today (present date) or past dates
    if (process.env.NODE_ENV !== 'test' && dto.startDate) {
      const todayStr = todayInIndia();
      if (dto.startDate.slice(0, 10) <= todayStr) {
        throw new BadRequestException(
          'Trip can start from tomorrow onwards. Today or past dates are not allowed.',
        );
      }
      // Rule (owner decision, Nov 2026): the earliest start date is tomorrow (India time).
    }

    const maxId = trips.length > 0 ? Math.max(...trips.map((t) => t.tripId)) : 0;
    const initialStatus = (normalizeStatus(dto.status) as Trip['status']) || 'Planning';

    const newTrip: Trip = {
      tripId: maxId + 1,
      title: dto.title,
      origin: dto.origin || 'New Delhi, India',
      destination: dto.destination,
      startDate: dto.startDate,
      endDate: dto.endDate,
      budget: dto.budget,
      travelerId: dto.travelerId,
      agencyId: dto.agencyId,
      guideId: dto.guideId ?? null,
      packageId: dto.packageId,
      status: initialStatus,
      passengerIds: dto.passengerIds,
      transportDetails: dto.transportDetails,
      itineraryDays: dto.itineraryDays,
      category: dto.category,
      notes: dto.notes,
      travelersCount: dto.travelersCount || (dto.passengerIds?.length || 1),
      ...(dto.guideId != null && { guideStatus: 'Pending' as Trip['guideStatus'], ...guideRequestTimes() }),
      ...((dto as any).draftPlan && { draftPlan: (dto as any).draftPlan }),
    };
    trips.push(newTrip);

    // If day-by-day itinerary array is provided, persist it to itineraries collection as well
    if (Array.isArray(dto.itineraryDays) && dto.itineraryDays.length > 0) {
      dto.itineraryDays.forEach((day, index) => {
        const dayNumber = day.dayNumber || index + 1;
        const activities = day.activities || (day.title ? [day.title] : ['Exploration & Sightseeing']);
        activities.forEach((act: string, actIdx: number) => {
          const maxItinId = itineraries.length > 0 ? Math.max(...itineraries.map((i) => i.itineraryId)) : 0;
          itineraries.push({
            itineraryId: maxItinId + 1,
            tripId: newTrip.tripId,
            city: day.city || newTrip.destination,
            dayNumber,
            activity: typeof act === 'string' ? act : JSON.stringify(act),
            activityStatus: 'Confirmed',
            time: day.time || (actIdx === 0 ? '09:00' : actIdx === 1 ? '14:00' : '19:00'),
          });
        });
      });
    }

    if (dto.agencyId) {
      const agency = agencies.find(a => a.agencyId === dto.agencyId);
      const commissionRate = agency?.commissionRate != null ? agency.commissionRate : 1.5;
      const commAmount = (dto.budget * commissionRate) / 100;
      const commId = commissionLedger.length > 0 ? Math.max(...commissionLedger.map(c => c.commissionId)) : 0;
      commissionLedger.push({
        commissionId: commId + 1,
        agencyId: dto.agencyId,
        tripId: newTrip.tripId,
        grossAmount: dto.budget,
        commissionAmount: commAmount,
        rate: commissionRate,
        status: initialStatus === 'Confirmed' || initialStatus === 'Active' ? 'earned' : 'pending',
        createdAt: new Date().toISOString()
      });

      // Create Payment record for agency-owned trip
      const paymentId = payments.length > 0 ? Math.max(...payments.map(p => p.paymentId)) : 0;
      payments.push({
        paymentId: paymentId + 1,
        amount: dto.budget,
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'Card',
        status: initialStatus === 'Confirmed' || initialStatus === 'Active' ? 'Paid' : 'Pending',
        tripId: newTrip.tripId,
        agencyId: dto.agencyId
      });
    }

    // Realtime notification for guide request
    if (newTrip.guideId) {
      if (this.realtimeService) {
        this.realtimeService.emitToUser(newTrip.guideId, 'guide_request.created', {
          tripId: newTrip.tripId,
          destination: newTrip.destination,
          startDate: newTrip.startDate,
          endDate: newTrip.endDate,
          budget: newTrip.budget,
          trip: newTrip,
        }, 'guide');
      }
      if (this.notificationsService) {
        this.notificationsService.createNotification(
          newTrip.guideId,
          'New Trip Guide Request',
          `You have a new guide assignment request for trip #${newTrip.tripId} to ${newTrip.destination}.`,
          { role: 'guide', type: 'guide_request', metadata: { tripId: newTrip.tripId } },
        ).catch(() => {});
      }
    }

    return newTrip;
  }

  update(id: number, dto: UpdateTripDto, actor?: TripActor): Trip {
    const idx = trips.findIndex((t) => t.tripId === id);
    if (idx === -1) throw new NotFoundException(`Trip with ID ${id} not found`);

    const current = trips[idx];
    const targetStatus = normalizeStatus(dto.status);

    assertTripUpdateAllowed(actor, current, { ...dto, ...(targetStatus !== undefined && { status: targetStatus }) });

    // Validate status transition if a new status is provided
    if (targetStatus !== undefined && targetStatus !== current.status) {
      const error = validateStatusTransition(current.status, targetStatus);
      if (error) {
        throw new BadRequestException(error);
      }
      assertTripStatusChangeAllowed(actor, current, targetStatus);
    }

    assertValidDate('Start date', dto.startDate);
    assertValidDate('End date', dto.endDate);
    if (
      process.env.NODE_ENV !== 'test' &&
      actor && !['admin', 'superuser', 'support'].includes(actor.role) &&
      dto.startDate && dto.startDate.slice(0, 10) !== String(current.startDate || '').slice(0, 10) &&
      dto.startDate.slice(0, 10) <= todayInIndia()
    ) {
      throw new BadRequestException('Trip start date must be tomorrow or later.');
    }
    const nextStart = dto.startDate ?? current.startDate;
    const nextEnd = dto.endDate ?? current.endDate;
    if ((dto.startDate !== undefined || dto.endDate !== undefined) && nextStart && nextEnd && nextEnd <= nextStart) {
      throw new BadRequestException('Trip end date must be strictly after the start date.');
    }
    if (dto.travelersCount !== undefined && (!Number.isInteger(dto.travelersCount) || dto.travelersCount < 1)) {
      throw new BadRequestException('Number of travelers must be a whole number of at least 1.');
    }
    if (dto.guideId !== undefined && dto.guideId !== null && !guides.some((g) => g.guideId === dto.guideId)) {
      throw new BadRequestException(`Guide #${dto.guideId} does not exist.`);
    }

    // When guideId changes, reset guideStatus to 'Pending'
    const guideChanged =
      dto.guideId !== undefined && dto.guideId !== current.guideId;

    // Guide availability check when accepting
    if (dto.guideStatus === 'Accepted' && current.guideStatus !== 'Accepted') {
      const guideId = dto.guideId ?? current.guideId;
      const startDate = dto.startDate ?? current.startDate;
      const endDate = dto.endDate ?? current.endDate;
      if (guideId && startDate && endDate && this.guideAvailabilityService) {
        const isAvailable = this.guideAvailabilityService.checkAvailability(guideId, startDate, endDate);
        if (!isAvailable) {
          throw new ConflictException(
            `Guide #${guideId} is already booked or held for overlapping dates (${startDate} to ${endDate}).`,
          );
        }
        try {
          this.guideAvailabilityService.blockDates(guideId, startDate, endDate, undefined, 'CONFIRMED', id);
        } catch {
          // If already blocked, proceed
        }
      }
    }

    const updated: Trip = {
      ...current,
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.origin !== undefined && { origin: dto.origin }),
      ...(dto.destination !== undefined && { destination: dto.destination }),
      ...(dto.startDate !== undefined && { startDate: dto.startDate }),
      ...(dto.endDate !== undefined && { endDate: dto.endDate }),
      ...(dto.budget !== undefined && { budget: dto.budget }),
      ...(dto.travelerId !== undefined && { travelerId: dto.travelerId }),
      ...(dto.agencyId !== undefined && { agencyId: dto.agencyId }),
      ...(dto.guideId !== undefined && { guideId: dto.guideId }),
      ...(dto.packageId !== undefined && { packageId: dto.packageId }),
      ...(targetStatus !== undefined && { status: targetStatus as Trip['status'] }),
      ...(dto.guideStatus !== undefined && !guideChanged && { guideStatus: dto.guideStatus as Trip['guideStatus'] }),
      guideDecisionReason:
        dto.guideDecisionReason ||
        dto.reason ||
        (dto.guideStatus === 'Declined' ? (dto.notes || 'Declined by guide') : current.guideDecisionReason),
      ...(guideChanged && {
        guideStatus: dto.guideId === null
          ? undefined
          : 'Pending' as Trip['guideStatus'],
        ...(dto.guideId === null
          ? { guideRequestedAt: undefined, guideResponseDueAt: undefined }
          : guideRequestTimes()),
      }),
      ...((dto as any).draftPlan !== undefined && { draftPlan: (dto as any).draftPlan }),
      ...(dto.passengerIds !== undefined && { passengerIds: dto.passengerIds }),
      ...(dto.transportDetails !== undefined && { transportDetails: dto.transportDetails }),
      ...(dto.itineraryDays !== undefined && { itineraryDays: dto.itineraryDays }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.travelersCount !== undefined && { travelersCount: dto.travelersCount }),
      ...(dto.cancellationReason !== undefined && { cancellationReason: dto.cancellationReason }),
      ...(targetStatus === 'Cancelled' && {
        cancellationReason: dto.cancellationReason || current.cancellationReason || 'Cancelled by user',
        cancelledAt: dto.cancelledAt || new Date().toISOString(),
        ...calculateCancellationRefund(current.startDate, current.budget),
      }),
    };
    trips[idx] = updated;

    // A replaced or declining guide no longer holds these dates.
    if (this.guideAvailabilityService && (guideChanged || (updated.guideStatus === 'Declined' && current.guideStatus !== 'Declined'))) {
      this.guideAvailabilityService.releaseTripDates(id);
    }
    if (targetStatus !== undefined && targetStatus !== current.status) {
      this.applyStatusSideEffects(updated, current.status, actor);
    }

    // Recalculate commission ledger if budget changed for an agency trip
    if (dto.budget !== undefined && current.agencyId) {
      const agency = agencies.find(a => a.agencyId === current.agencyId);
      const rate = agency?.commissionRate ?? 1.5;
      commissionLedger.forEach((entry, i) => {
        if (entry.tripId === id) {
          commissionLedger[i] = {
            ...entry,
            grossAmount: dto.budget!,
            commissionAmount: (dto.budget! * (entry.rate || rate)) / 100,
          };
        }
      });
    }

    // Settle / earn / void commission on status updates
    if (targetStatus === 'Completed') {
      commissionLedger.forEach((entry, i) => {
        if (entry.tripId === id) {
          commissionLedger[i] = { ...entry, status: 'settled' };
        }
      });
    } else if (targetStatus === 'Confirmed' || targetStatus === 'Active') {
      commissionLedger.forEach((entry, i) => {
        if (entry.tripId === id && entry.status === 'pending') {
          commissionLedger[i] = { ...entry, status: 'earned' };
        }
      });
    } else if (targetStatus === 'Cancelled') {
      commissionLedger.forEach((entry, i) => {
        if (entry.tripId === id) {
          commissionLedger[i] = { ...entry, status: 'cancelled' };
        }
      });
    }

    // Realtime events for guide request decisions or reassignments
    const creatorId = updated.travelerId || updated.agencyId;
    if (updated.guideStatus !== current.guideStatus) {
      if (updated.guideStatus === 'Accepted') {
        if (this.realtimeService) {
          if (creatorId) {
            this.realtimeService.emitToUser(creatorId, 'guide_request.accepted', {
              tripId: updated.tripId,
              guideId: updated.guideId,
              trip: updated,
            }, (updated.travelerId ? 'traveler' : 'agency'));
          }
          this.realtimeService.emitToBooking(updated.tripId, 'guide_request.accepted', {
            tripId: updated.tripId,
            guideId: updated.guideId,
            trip: updated,
          });
        }
        if (this.notificationsService && creatorId) {
          this.notificationsService.createNotification(
            creatorId,
            'Guide Request Accepted',
            `The guide has accepted trip #${updated.tripId} (${updated.destination}). Continue booking from My Trips.`,
            { role: (updated.travelerId ? 'traveler' : 'agency'), type: 'guide_accepted', metadata: { tripId: updated.tripId } },
          ).catch(() => {});
        }
      } else if (updated.guideStatus === 'Declined') {
        if (this.realtimeService) {
          if (creatorId) {
            this.realtimeService.emitToUser(creatorId, 'guide_request.declined', {
              tripId: updated.tripId,
              guideId: updated.guideId,
              trip: updated,
            }, (updated.travelerId ? 'traveler' : 'agency'));
          }
          this.realtimeService.emitToBooking(updated.tripId, 'guide_request.declined', {
            tripId: updated.tripId,
            guideId: updated.guideId,
            trip: updated,
          });
        }
        if (this.notificationsService && creatorId) {
          this.notificationsService.createNotification(
            creatorId,
            'Guide Request Declined',
            `The assigned guide declined trip #${updated.tripId}. Please select an alternative guide.`,
            { role: (updated.travelerId ? 'traveler' : 'agency'), type: 'guide_declined', metadata: { tripId: updated.tripId } },
          ).catch(() => {});
        }
      }
    } else if (guideChanged && updated.guideId) {
      if (this.realtimeService) {
        this.realtimeService.emitToUser(updated.guideId, 'guide_request.created', {
          tripId: updated.tripId,
          destination: updated.destination,
          trip: updated,
        }, 'guide');
      }
      if (this.notificationsService) {
        this.notificationsService.createNotification(
          updated.guideId,
          'New Trip Guide Request',
          `You have a new guide assignment request for trip #${updated.tripId} to ${updated.destination}.`,
          { role: 'guide', type: 'guide_request', metadata: { tripId: updated.tripId } },
        ).catch(() => {});
      }
    }

    return updated;
  }

  updateStatus(id: number, status: string, cancellationReason?: string, actor?: TripActor): Trip {
    const idx = trips.findIndex((t) => t.tripId === id);
    if (idx === -1) throw new NotFoundException(`Trip with ID ${id} not found`);

    const current = trips[idx];
    const targetStatus = normalizeStatus(status) || status;

    // Validate status transition using shared rules
    const error = validateStatusTransition(current.status, targetStatus);
    if (error) {
      throw new BadRequestException(error);
    }
    assertTripStatusChangeAllowed(actor, current, targetStatus);

    trips[idx] = {
      ...current,
      status: targetStatus as Trip['status'],
      ...(targetStatus === 'Cancelled' && {
        cancellationReason: cancellationReason || current.cancellationReason || 'Cancelled by user',
        cancelledAt: new Date().toISOString(),
        ...calculateCancellationRefund(current.startDate, current.budget),
      }),
    };

    // Settle / earn / void commission on status updates
    if (targetStatus === 'Completed') {
      commissionLedger.forEach((entry, i) => {
        if (entry.tripId === id) {
          commissionLedger[i] = { ...entry, status: 'settled' };
        }
      });
    } else if (targetStatus === 'Confirmed' || targetStatus === 'Active') {
      commissionLedger.forEach((entry, i) => {
        if (entry.tripId === id && entry.status === 'pending') {
          commissionLedger[i] = { ...entry, status: 'earned' };
        }
      });
    } else if (targetStatus === 'Cancelled') {
      commissionLedger.forEach((entry, i) => {
        if (entry.tripId === id) {
          commissionLedger[i] = { ...entry, status: 'cancelled' };
        }
      });
    }

    if (targetStatus !== current.status) {
      this.applyStatusSideEffects(trips[idx], current.status, actor);
    }

    if (this.realtimeService) {
      this.realtimeService.emitToBooking(id, 'booking.status_changed', { tripId: id, status: targetStatus });
    }

    return trips[idx];
  }

  /**
   * Keep the trip's bookings and the guide's calendar consistent with the trip status:
   *  - Cancelled: every open booking is cancelled through the refund policy and the
   *    guide's dates are released.
   *  - Completed: every confirmed booking becomes COMPLETED (this is what unlocks reviews).
   */
  private applyStatusSideEffects(trip: Trip, previousStatus: string, actor?: TripActor): void {
    if (trip.status === 'Cancelled') {
      this.guideAvailabilityService?.releaseTripDates(trip.tripId);
      if (this.policyService) {
        for (const b of bookings.filter((x) => x.tripId === trip.tripId)) {
          const st = String(b.status).toUpperCase();
          if (['HELD', 'DRAFT', 'PENDING', 'PAID', 'CONFIRMED'].includes(st)) {
            this.policyService
              .cancelBooking(b.bookingId, trip.cancellationReason || 'Trip cancelled', actor?.userId)
              .catch(() => {
                // Bookings that cannot be cancelled automatically (e.g. inside the 12-hour
                // window) are still closed so the trip is not left half-cancelled.
                b.status = 'Cancelled';
                b.cancellationReason = trip.cancellationReason || 'Trip cancelled';
                b.cancelledAt = new Date().toISOString();
              });
          }
        }
      }
    }
    if (trip.status === 'Completed') {
      for (const b of bookings.filter((x) => x.tripId === trip.tripId)) {
        if (['CONFIRMED', 'PAID'].includes(String(b.status).toUpperCase())) {
          b.status = 'COMPLETED';
        }
      }
    }
  }

  /**
   * Checks all dependent collections for references to the given tripId.
   * Returns a list of human-readable dependency descriptions, or empty if none.
   */
  private findTripDependents(tripId: number): string[] {
    const dependents: string[] = [];

    const dependentBookings = bookings.filter((b) => b.tripId === tripId);
    if (dependentBookings.length > 0) {
      dependents.push(
        `${dependentBookings.length} booking(s): IDs [${dependentBookings.map((b) => b.bookingId).join(', ')}]`,
      );
    }

    const dependentItineraries = itineraries.filter((i) => i.tripId === tripId);
    if (dependentItineraries.length > 0) {
      dependents.push(
        `${dependentItineraries.length} itinerary item(s): IDs [${dependentItineraries.map((i) => i.itineraryId).join(', ')}]`,
      );
    }

    const dependentExpenses = expenses.filter((e) => e.tripId === tripId);
    if (dependentExpenses.length > 0) {
      dependents.push(
        `${dependentExpenses.length} expense(s): IDs [${dependentExpenses.map((e) => e.expenseId).join(', ')}]`,
      );
    }

    // Payments linked directly to this trip
    const dependentPayments = payments.filter((p) => p.tripId === tripId);
    if (dependentPayments.length > 0) {
      dependents.push(
        `${dependentPayments.length} payment(s): IDs [${dependentPayments.map((p) => p.paymentId).join(', ')}]`,
      );
    }

    // Payments linked via bookings that belong to this trip
    const bookingIds = dependentBookings.map((b) => b.bookingId);
    if (bookingIds.length > 0) {
      const bookingPayments = payments.filter(
        (p) => p.bookingId && bookingIds.includes(p.bookingId),
      );
      if (bookingPayments.length > 0) {
        dependents.push(
          `${bookingPayments.length} payment(s) via bookings`,
        );
      }
    }

    const dependentCommissions = commissionLedger.filter((c) => c.tripId === tripId);
    if (dependentCommissions.length > 0) {
      dependents.push(
        `${dependentCommissions.length} commission ledger entry/entries`,
      );
    }

    return dependents;
  }

  remove(id: number): { message: string } {
    const idx = trips.findIndex((t) => t.tripId === id);
    if (idx === -1) throw new NotFoundException(`Trip with ID ${id} not found`);

    const dependents = this.findTripDependents(id);
    if (dependents.length > 0) {
      throw new ConflictException(
        `Cannot delete trip ${id}: referenced by ${dependents.join('; ')}. Remove or reassign dependent records first.`,
      );
    }

    trips.splice(idx, 1);
    return { message: `Trip with ID ${id} deleted successfully` };
  }
}
