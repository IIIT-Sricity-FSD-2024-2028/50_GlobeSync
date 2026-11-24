import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { testDb } from '../database/test-database';
import { BookingStateMachine } from '../bookings/state-machine/booking-state-machine';
import { BookingStatus } from '../bookings/state-machine/booking-status.enum';
import { InventoryService } from '../inventory/inventory.service';
import { GuideAvailabilityService } from '../guides/guide-availability.service';
import { bookings, payments, Payment } from '../data';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email.service';

export interface PaymentIntent {
  id: number;
  intentId: string;
  gateway: 'RAZORPAY' | 'STRIPE';
  bookingId: number;
  travelerId: number;
  amountMinor: number;
  currency: string;
  status: 'CREATED' | 'REQUIRES_PAYMENT' | 'SUCCEEDED' | 'FAILED';
  clientSecret?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  event: string;
  eventId: string;
  paymentId?: string;
  bookingId?: number;
  status: string;
  message: string;
}

const DEFAULT_WEBHOOK_SECRET = 'whsec_globesync_test_secret_2026';

@Injectable()
export class GatewayPaymentService {
  private webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || DEFAULT_WEBHOOK_SECRET;

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly guideAvailabilityService: GuideAvailabilityService,
    @Optional() private readonly realtimeService?: RealtimeService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  /**
   * Create a Payment Intent in test mode.
   * Stores payment intents, NEVER card data.
   */
  async createPaymentIntent(params: {
    bookingId: number;
    travelerId: number;
    amountMinor: number;
    currency?: string;
    idempotencyKey?: string;
  }): Promise<PaymentIntent> {
    if (!testDb.paymentIntents) {
      testDb.paymentIntents = [];
    }

    const intentId = `order_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const maxId = testDb.paymentIntents.length > 0
      ? Math.max(...testDb.paymentIntents.map((i: PaymentIntent) => i.id))
      : 0;

    const intent: PaymentIntent = {
      id: maxId + 1,
      intentId,
      gateway: 'RAZORPAY',
      bookingId: params.bookingId,
      travelerId: params.travelerId,
      amountMinor: params.amountMinor,
      currency: params.currency || 'INR',
      status: 'REQUIRES_PAYMENT',
      clientSecret: `cs_${intentId}_secret`,
      idempotencyKey: params.idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    testDb.paymentIntents.push(intent);
    return intent;
  }

  /**
   * Verify HMAC-SHA256 signature on incoming webhook payload.
   */
  verifyWebhookSignature(rawBody: string, signature: string, secret?: string): boolean {
    if (!signature || !rawBody) return false;
    const key = secret || this.webhookSecret;
    try {
      const expectedSignature = crypto
        .createHmac('sha256', key)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Process Gateway Webhook.
   *  1. Verifies HMAC signature.
   *  2. Protects against duplicate / replay events (idempotent 200).
   *  3. Drives booking status: HELD -> PAID -> CONFIRMED.
   *  4. Confirms inventory and guide reservations.
   */
  async processWebhook(
    eventPayload: any,
    signature: string,
    rawBody: string,
  ): Promise<WebhookProcessingResult> {
    // 1. Signature Verification
    const isValid = this.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid gateway webhook signature.');
    }

    if (!testDb.processedWebhooks) {
      testDb.processedWebhooks = new Set<string>();
    }

    const eventId = eventPayload.id || eventPayload.event_id || `evt_${Date.now()}`;
    const eventType = eventPayload.event || 'payment.captured';

    // 2. Webhook Replay Protection: safe idempotency
    if (testDb.processedWebhooks.has(eventId)) {
      return {
        success: true,
        event: eventType,
        eventId,
        status: 'ALREADY_PROCESSED',
        message: `Webhook event '${eventId}' has already been processed. Replay safely ignored.`,
      };
    }

    // 3. Process payment success event
    if (eventType === 'payment.captured' || eventType === 'payment_intent.succeeded') {
      const paymentData = eventPayload.payload?.payment?.entity || eventPayload.data?.object || eventPayload;
      const bookingId = Number(paymentData.notes?.bookingId || paymentData.bookingId || paymentData.metadata?.bookingId);

      if (!bookingId) {
        throw new BadRequestException('Webhook payload missing valid bookingId reference.');
      }

      const booking = this.findBookingOrThrow(bookingId);

      // State Machine Transition: Current -> PAID -> CONFIRMED
      BookingStateMachine.assertValidTransition(booking.status, BookingStatus.PAID);
      booking.status = BookingStatus.PAID;
      booking.paidAt = new Date().toISOString();

      BookingStateMachine.assertValidTransition(booking.status, BookingStatus.CONFIRMED);
      booking.status = BookingStatus.CONFIRMED;
      booking.confirmedAt = new Date().toISOString();

      // Confirm inventory reservations if any
      if (booking.reservationRef) {
        await this.inventoryService.confirmHold(booking.reservationRef);
      }

      // Confirm guide reservation if any
      if (booking.guideId) {
        this.guideAvailabilityService.confirmHold(bookingId);
      }

      // Record completed Payment entry
      const maxPaymentId = payments.length > 0 ? Math.max(...payments.map((p) => p.paymentId)) : 0;
      const paymentRecord: Payment = {
        paymentId: maxPaymentId + 1,
        bookingId,
        travelerId: booking.travelerId || 1,
        amount: (booking.total_minor || 0) / 100,
        paymentDate: new Date().toISOString(),
        method: 'UPI',
        status: 'Paid',
      };
      payments.push(paymentRecord);
      if (testDb.payments) {
        testDb.payments.push({
          id: paymentRecord.paymentId,
          booking_id: bookingId,
          traveler_id: booking.travelerId || 1,
          amount_minor: booking.total_minor || 0,
          currency: 'INR',
          status: 'COMPLETED',
          payment_method: 'UPI',
          transaction_ref: paymentData.id || `pay_${Date.now()}`,
          created_at: new Date(),
        });
      }

      // Mark event as processed to prevent replay
      testDb.processedWebhooks.add(eventId);

      // Realtime event: booking.status_changed
      if (this.realtimeService) {
        this.realtimeService.emitToBooking(bookingId, 'booking.status_changed', {
          bookingId,
          status: BookingStatus.CONFIRMED,
          booking,
        });
        if (booking.travelerId) {
          this.realtimeService.emitToUser(booking.travelerId, 'booking.status_changed', {
            bookingId,
            status: BookingStatus.CONFIRMED,
            booking,
          }, 'traveler');
        }
      }

      // Notification
      if (this.notificationsService && booking.travelerId) {
        const displayAmount = `₹${((booking.total_minor || 0) / 100).toFixed(2)}`;
        this.notificationsService.createNotification(
          booking.travelerId,
          'Payment Confirmed!',
          `Payment of ${displayAmount} for Booking #${bookingId} was successfully processed. Your trip is confirmed!`,
          { role: 'traveler', type: 'payment_confirmed', metadata: { bookingId } },
        ).catch(() => {});
      }

      // Email dispatch
      if (this.emailService && booking.travelerId) {
        const travelerUser = testDb.users.find((u: any) => u.id === booking.travelerId);
        const travelerEmail = travelerUser?.email || 'traveler@ticp.com';
        const displayAmount = `₹${((booking.total_minor || 0) / 100).toFixed(2)}`;
        this.emailService.sendBookingConfirmation(travelerEmail, {
          bookingId,
          destination: (booking as any).service || 'Tour Package',
          amount: displayAmount,
        }).catch(() => {});
      }

      return {
        success: true,
        event: eventType,
        eventId,
        paymentId: paymentData.id,
        bookingId,
        status: 'CONFIRMED',
        message: `Booking #${bookingId} successfully confirmed via webhook event '${eventId}'.`,
      };
    }

    testDb.processedWebhooks.add(eventId);
    return {
      success: true,
      event: eventType,
      eventId,
      status: 'IGNORED',
      message: `Webhook event '${eventType}' acknowledged.`,
    };
  }

  private findBookingOrThrow(bookingId: number): any {
    let found = bookings.find((b) => b.bookingId === bookingId);
    if (found) return found;

    found = (testDb.bookings || []).find((b: any) => b.id === bookingId || b.bookingId === bookingId);
    if (found) return found;

    throw new NotFoundException(`Booking #${bookingId} not found.`);
  }
}
