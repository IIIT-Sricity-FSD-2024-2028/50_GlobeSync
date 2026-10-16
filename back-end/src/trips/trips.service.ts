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
    const newTrip: Trip = {
      tripId: maxId + 1,
      origin: dto.origin || 'New Delhi, India',
      destination: dto.destination,
      startDate: dto.startDate,
      endDate: dto.endDate,
      budget: dto.budget,
      travelerId: dto.travelerId,
      agencyId: dto.agencyId,
      guideId: dto.guideId ?? null,
      packageId: dto.packageId,
      status: (dto.status as Trip['status']) || 'Planning',
      // Fix 3: Initialize guideStatus consistently when a guide is assigned at creation
      ...(dto.guideId != null && { guideStatus: 'Pending' as Trip['guideStatus'] }),
    };
    trips.push(newTrip);

    if (dto.agencyId) {
      const agency = agencies.find(a => a.agencyId === dto.agencyId);
      if (agency && agency.commissionRate != null) {
        const commAmount = (dto.budget * agency.commissionRate) / 100;
        const commId = commissionLedger.length > 0 ? Math.max(...commissionLedger.map(c => c.commissionId)) : 0;
        commissionLedger.push({
          commissionId: commId + 1,
          agencyId: dto.agencyId,
          tripId: newTrip.tripId,
          grossAmount: dto.budget,
          commissionAmount: commAmount,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      // Create Payment record for agency-owned trip
      const paymentId = payments.length > 0 ? Math.max(...payments.map(p => p.paymentId)) : 0;
      payments.push({
        paymentId: paymentId + 1,
        amount: dto.budget,
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'Card', // default/assumed for agency platform billing
        status: 'Paid',
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

    // Fix 2: Validate status transition if a new status is provided
    if (dto.status !== undefined && dto.status !== current.status) {
      const error = validateStatusTransition(current.status, dto.status);
      if (error) {
        throw new BadRequestException(error);
      }
    }

    // Fix 3: When guideId changes, reset guideStatus to 'Pending'
    const guideChanged =
      dto.guideId !== undefined && dto.guideId !== current.guideId;

    const updated: Trip = {
      ...current,
      ...(dto.origin !== undefined && { origin: dto.origin }),
      ...(dto.destination !== undefined && { destination: dto.destination }),
      ...(dto.startDate !== undefined && { startDate: dto.startDate }),
      ...(dto.endDate !== undefined && { endDate: dto.endDate }),
      ...(dto.budget !== undefined && { budget: dto.budget }),
      ...(dto.travelerId !== undefined && { travelerId: dto.travelerId }),
      ...(dto.agencyId !== undefined && { agencyId: dto.agencyId }),
      ...(dto.guideId !== undefined && { guideId: dto.guideId }),
      ...(dto.packageId !== undefined && { packageId: dto.packageId }),
      ...(dto.status !== undefined && { status: dto.status as Trip['status'] }),
      // If a new guideStatus is explicitly provided and guide didn't change, apply it
      ...(dto.guideStatus !== undefined && !guideChanged && { guideStatus: dto.guideStatus as Trip['guideStatus'] }),
      // If guide assignment changed, reset guideStatus regardless of any explicit value
      ...(guideChanged && {
        guideStatus: dto.guideId === null
          ? undefined  // no guide assigned → clear guideStatus
          : 'Pending' as Trip['guideStatus'],
      }),
    };
    trips[idx] = updated;

    // When a trip is updated to completed, settle all pending commission entries for it
    if (dto.status === 'Completed') {
      commissionLedger.forEach((entry, i) => {
        if (entry.tripId === id && entry.status === 'pending') {
          commissionLedger[i] = { ...entry, status: 'settled' };
        }
      });
    }

    return updated;
  }

  updateStatus(id: number, status: string): Trip {
    const idx = trips.findIndex((t) => t.tripId === id);
    if (idx === -1) throw new NotFoundException(`Trip with ID ${id} not found`);

    const current = trips[idx];

    // Fix 2: Validate status transition using shared rules
    const error = validateStatusTransition(current.status, status);
    if (error) {
      throw new BadRequestException(error);
    }

    trips[idx] = { ...current, status: status as Trip['status'] };

    // When a trip is completed, settle all pending commission entries for it
    if (status === 'Completed') {
      commissionLedger.forEach((entry, i) => {
        if (entry.tripId === id && entry.status === 'pending') {
          commissionLedger[i] = { ...entry, status: 'settled' };
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
