import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { testDb } from '../database/test-database';

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
   * Check if a guide is available for the given date range.
   */
  checkAvailability(guideId: number, startDate: string, endDate: string, excludeBookingId?: number, excludeTripId?: number): boolean {
    if (!testDb.guideBlockedDates) {
      testDb.guideBlockedDates = [];
    }

    const conflicts = testDb.guideBlockedDates.filter((block: GuideBlockedDate) => {
      if (block.guideId !== guideId) return false;
      if (excludeTripId && block.tripId === excludeTripId) return false;
      if (excludeBookingId && block.bookingId === excludeBookingId) return false;
      if (block.status !== 'HELD' && block.status !== 'CONFIRMED') return false;

      return this.doRangesOverlap(block.startDate, block.endDate, startDate, endDate);
    });

    return conflicts.length === 0;
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
