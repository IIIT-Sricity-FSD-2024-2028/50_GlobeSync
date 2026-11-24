import { Injectable, Logger, Optional } from '@nestjs/common';
import { bookings } from '../data';
import { testDb } from '../database/test-database';
import { BookingStateMachine } from './state-machine/booking-state-machine';
import { BookingStatus } from './state-machine/booking-status.enum';
import { InventoryService } from '../inventory/inventory.service';
import { GuideAvailabilityService } from '../guides/guide-availability.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class HoldExpiryService {
  private readonly logger = new Logger(HoldExpiryService.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly guideAvailabilityService: GuideAvailabilityService,
    @Optional() private readonly realtimeService?: RealtimeService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Scan and release all holds that have passed their 15-minute expiration deadline.
   */
  async checkAndReleaseExpiredHolds(nowUtc?: Date): Promise<{ releasedCount: number; expiredBookingIds: number[] }> {
    const now = nowUtc || new Date();
    const nowIso = now.toISOString();
    const expiredBookingIds: number[] = [];

    // Collect all candidate bookings from both data stores
    const candidateList = [...bookings, ...(testDb.bookings || [])];

    for (const booking of candidateList) {
      const bId = booking.bookingId || booking.id;
      if (!bId || expiredBookingIds.includes(bId)) continue;

      // Only check bookings currently in HELD / Pending status
      const normalized = BookingStateMachine.normalizeStatus(booking.status);
      if (normalized !== BookingStatus.HELD) continue;

      // Check if hold has expired
      if (booking.holdExpiresAtUtc && booking.holdExpiresAtUtc <= nowIso) {
        // Enforce State Machine transition: HELD -> EXPIRED
        BookingStateMachine.assertValidTransition(booking.status, BookingStatus.EXPIRED);
        booking.status = BookingStatus.EXPIRED;
        booking.expiredAt = nowIso;

        // 1. Release held inventory seats/rooms
        if (booking.reservationRef) {
          await this.inventoryService.releaseHold(booking.reservationRef);
        }

        // 2. Release held guide dates
        if (booking.guideId) {
          this.guideAvailabilityService.releaseDates(bId);
        }

        // 3. Emit booking.status_changed event
        if (this.realtimeService) {
          this.realtimeService.emitToBooking(bId, 'booking.status_changed', {
            bookingId: bId,
            status: BookingStatus.EXPIRED,
            booking,
          });
          if (booking.travelerId) {
            this.realtimeService.emitToUser(booking.travelerId, 'booking.status_changed', {
              bookingId: bId,
              status: BookingStatus.EXPIRED,
              booking,
            }, 'traveler');
          }
        }

        if (this.notificationsService && booking.travelerId) {
          this.notificationsService.createNotification(
            booking.travelerId,
            'Booking Hold Expired',
            `The 15-minute hold for Booking #${bId} has expired. Please initiate a new booking.`,
            { role: 'traveler', type: 'booking_expired', metadata: { bookingId: bId } },
          ).catch(() => {});
        }

        expiredBookingIds.push(bId);
        this.logger.log(`Booking #${bId} hold expired at ${booking.holdExpiresAtUtc}; released inventory & guide.`);
      }
    }

    return {
      releasedCount: expiredBookingIds.length,
      expiredBookingIds,
    };
  }
}
