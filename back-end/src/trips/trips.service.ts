import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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

@Injectable()
export class TripsService {
  findAll(): Trip[] { return trips; }

  findOne(id: number): Trip {
    const trip = trips.find((t) => t.tripId === id);
    if (!trip) throw new NotFoundException(`Trip with ID ${id} not found`);
    return trip;
  }

  findByTraveler(travelerId: number): Trip[] {
    return trips.filter((t) => t.travelerId === travelerId);
  }

  findByGuide(guideId: number): Trip[] {
    return trips.filter((t) => t.guideId === guideId);
  }

  findByAgency(agencyId: number): Trip[] {
    return trips.filter((t) => t.agencyId === agencyId);
  }

  create(dto: CreateTripDto): Trip {
    if (!!dto.travelerId === !!dto.agencyId) {
      throw new BadRequestException('Exactly one of travelerId or agencyId must be provided.');
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
      ...(dto.guideId != null && { guideStatus: 'Pending' as Trip['guideStatus'] }),
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

    return newTrip;
  }

  update(id: number, dto: UpdateTripDto): Trip {
    const idx = trips.findIndex((t) => t.tripId === id);
    if (idx === -1) throw new NotFoundException(`Trip with ID ${id} not found`);

    const current = trips[idx];
    const targetStatus = normalizeStatus(dto.status);

    // Validate status transition if a new status is provided
    if (targetStatus !== undefined && targetStatus !== current.status) {
      const error = validateStatusTransition(current.status, targetStatus);
      if (error) {
        throw new BadRequestException(error);
      }
    }

    // When guideId changes, reset guideStatus to 'Pending'
    const guideChanged =
      dto.guideId !== undefined && dto.guideId !== current.guideId;

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
      ...(guideChanged && {
        guideStatus: dto.guideId === null
          ? undefined
          : 'Pending' as Trip['guideStatus'],
      }),
      ...(dto.passengerIds !== undefined && { passengerIds: dto.passengerIds }),
      ...(dto.transportDetails !== undefined && { transportDetails: dto.transportDetails }),
      ...(dto.itineraryDays !== undefined && { itineraryDays: dto.itineraryDays }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.travelersCount !== undefined && { travelersCount: dto.travelersCount }),
    };
    trips[idx] = updated;

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

    return updated;
  }

  updateStatus(id: number, status: string): Trip {
    const idx = trips.findIndex((t) => t.tripId === id);
    if (idx === -1) throw new NotFoundException(`Trip with ID ${id} not found`);

    const current = trips[idx];
    const targetStatus = normalizeStatus(status) || status;

    // Validate status transition using shared rules
    const error = validateStatusTransition(current.status, targetStatus);
    if (error) {
      throw new BadRequestException(error);
    }

    trips[idx] = { ...current, status: targetStatus as Trip['status'] };

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

    return trips[idx];
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
