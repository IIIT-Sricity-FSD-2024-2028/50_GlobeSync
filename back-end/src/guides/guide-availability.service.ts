import { Injectable, ConflictException } from '@nestjs/common';
import { testDb } from '../database/test-database';
import { guides, trips, bookings } from '../data';

export interface GuideBlockedDate {
  id: number;
  guideId: number;
  bookingId?: number;
  /** trip whose accepted guide assignment created this block */
  tripId?: number;
  startDate: string; // 'YYYY-MM-DD' or ISO string
  endDate: string; // 'YYYY-MM-DD' or ISO string
  status: 'HELD' | 'CONFIRMED';
  createdAt: string;
}

@Injectable()
export class GuideAvailabilityService {
  /**
   * Parse date to timestamp (ignoring time components for day-level scheduling)
   */
  private toDayTimestamp(dateStr: string): number {
    const d = new Date(dateStr);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).getTime();
  }

  /**
   * Check if two date ranges overlap: startA < endB && endA > startB
   */
  private doRangesOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ): boolean {
    const sA = this.toDayTimestamp(startA);
    const eA = this.toDayTimestamp(endA);
    const sB = this.toDayTimestamp(startB);
    const eB = this.toDayTimestamp(endB);

    // Trip end dates are the last day of the trip (inclusive), so a trip ending on
    // the 27th and another starting on the 27th both need the guide that day.
    return sA <= eB && eA >= sB;
  }

  /**
   * Check whether a guide account and calendar are eligible for the given inclusive date range.
   */
  findConflictReason(
    guideId: number,
    startDate: string,
    endDate: string,
    excludeBookingId?: number,
    excludeTripId?: number,
  ): string | null {
    const guide = guides.find((g) => g.guideId === guideId);
    if (guide) {
      const acctStatus = String(guide.status || 'ACTIVE').toUpperCase();
      if (['SUSPENDED', 'INACTIVE', 'DEACTIVATED'].includes(acctStatus)) {
        return `Guide #${guideId} account is ${acctStatus.toLowerCase()}.`;
      }
      const verStatus = String(guide.verificationStatus || 'VERIFIED').toUpperCase();
      if (['UNVERIFIED', 'REJECTED'].includes(verStatus)) {
        return `Guide #${guideId} is not verified for assignments.`;
      }
      if (guide.availability === 'away') {
        return `Guide #${guideId} is currently marked away.`;
      }
    }

    if (!testDb.guideBlockedDates) {
      testDb.guideBlockedDates = [];
    }

    const nowMs = Date.now();
    const blockConflict = testDb.guideBlockedDates.find((block: GuideBlockedDate) => {
      if (block.guideId !== guideId) return false;
      if (excludeTripId && block.tripId === excludeTripId) return false;
      if (excludeBookingId && block.bookingId === excludeBookingId) return false;
      if (block.status !== 'HELD' && block.status !== 'CONFIRMED') return false;
      if (block.status === 'HELD' && block.bookingId) {
        const b = bookings.find((bk) => bk.bookingId === block.bookingId);
        if (b && (String(b.status).toUpperCase() === 'CANCELLED' || String(b.status).toUpperCase() === 'EXPIRED')) {
          return false;
        }
        if (b?.holdExpiresAtUtc && new Date(b.holdExpiresAtUtc).getTime() < nowMs) {
          return false;
        }
      }
      return this.doRangesOverlap(block.startDate, block.endDate, startDate, endDate);
    });

    if (blockConflict) {
      return `Dates ${blockConflict.startDate} to ${blockConflict.endDate} are already reserved${blockConflict.tripId ? ` (Trip #${blockConflict.tripId})` : ''}.`;
    }

    // Authoritative trip-based conflict check (survives restarts & unhydrated guideBlockedDates)
    const tripConflict = trips.find((t) => {
      if (t.guideId !== guideId) return false;
      if (excludeTripId && t.tripId === excludeTripId) return false;
      if (t.guideStatus !== 'Accepted') return false;
      if (t.status === 'Cancelled' || t.status === 'Completed') return false;
      if (!t.startDate || !t.endDate) return false;
      return this.doRangesOverlap(t.startDate, t.endDate, startDate, endDate);
    });

    if (tripConflict) {
      return `Already assigned to Trip #${tripConflict.tripId} (${tripConflict.startDate} to ${tripConflict.endDate}).`;
    }

    return null;
  }

  /**
   * Check if a guide is available for the given date range.
   */
  checkAvailability(guideId: number, startDate: string, endDate: string, excludeBookingId?: number, excludeTripId?: number): boolean {
    return this.findConflictReason(guideId, startDate, endDate, excludeBookingId, excludeTripId) === null;
  }

  /**
   * Atomically reserve / block dates for a guide.
   * Throws ConflictException if overlapping booking exists.
   */
  blockDates(
    guideId: number,
    startDate: string,
    endDate: string,
    bookingId?: number,
    status: 'HELD' | 'CONFIRMED' = 'HELD',
    tripId?: number,
  ): GuideBlockedDate {
    if (!testDb.guideBlockedDates) {
      testDb.guideBlockedDates = [];
    }

    // Atomic conflict verification
    const isAvailable = this.checkAvailability(guideId, startDate, endDate, bookingId, tripId);
    if (!isAvailable) {
      throw new ConflictException(
        `Guide #${guideId} is already booked or held for overlapping dates (${startDate} to ${endDate}). Please choose an alternative guide or select different dates.`,
      );
    }

    const maxId = testDb.guideBlockedDates.length > 0
      ? Math.max(...testDb.guideBlockedDates.map((b: GuideBlockedDate) => b.id))
      : 0;

    const newBlock: GuideBlockedDate = {
      id: maxId + 1,
      guideId,
      bookingId,
      tripId,
      startDate,
      endDate,
      status,
      createdAt: new Date().toISOString(),
    };

    testDb.guideBlockedDates.push(newBlock);
    return newBlock;
  }

  /**
   * Confirm a guide hold upon successful payment.
   */
  confirmHold(bookingId: number): void {
    if (!testDb.guideBlockedDates) return;
    const block = testDb.guideBlockedDates.find((b: GuideBlockedDate) => b.bookingId === bookingId);
    if (block) {
      block.status = 'CONFIRMED';
    }
  }

  /**
   * Release blocked dates for a booking (e.g. hold expiration or cancellation).
   */
  releaseDates(bookingId: number): void {
    if (!testDb.guideBlockedDates) return;
    testDb.guideBlockedDates = testDb.guideBlockedDates.filter(
      (b: GuideBlockedDate) => b.bookingId !== bookingId,
    );
  }

  /**
   * Get all blocked dates for a guide.
   */
  /** Free the guide's calendar when a trip is cancelled or the guide is replaced. */
  releaseTripDates(tripId: number): void {
    if (!testDb.guideBlockedDates) return;
    testDb.guideBlockedDates = testDb.guideBlockedDates.filter(
      (b: GuideBlockedDate) => b.tripId !== tripId,
    );
  }

  getGuideBlockedDates(guideId: number): GuideBlockedDate[] {
    if (!testDb.guideBlockedDates) return [];
    return testDb.guideBlockedDates.filter((b: GuideBlockedDate) => b.guideId === guideId);
  }
}
