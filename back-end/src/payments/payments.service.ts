import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { payments, Payment, bookings } from '../data';
import { CreatePaymentDto } from './dto';
import { RevenueService } from '../revenue/revenue.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { GatewayPaymentService, PaymentIntent, WebhookProcessingResult } from './gateway-payment.service';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { BookingStateMachine } from '../bookings/state-machine/booking-state-machine';
import { BookingStatus } from '../bookings/state-machine/booking-status.enum';
import { confirmTripIfFullyPaid } from '../trips/trip-lifecycle';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly revenueService: RevenueService,
    private readonly systemConfigService: SystemConfigService,
    private readonly gatewayPaymentService: GatewayPaymentService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  findAll(): Payment[] {
    return payments;
  }

  findOne(id: number): Payment {
    const p = payments.find((p) => p.paymentId === id);
    if (!p) throw new NotFoundException(`Payment with ID ${id} not found`);
    return p;
  }

  findByBooking(bookingId: number): Payment[] {
    return payments.filter((p) => p.bookingId === bookingId);
  }

  findByAgency(agencyId: number): Payment[] {
    return payments.filter((p) => p.agencyId === agencyId);
  }

  /**
   * Create a Payment Intent (gateway order) in test mode.
   */
  async createPaymentIntent(params: {
    bookingId: number;
    travelerId: number;
    amountMinor: number;
    currency?: string;
    idempotencyKey?: string;
  }): Promise<PaymentIntent> {
    if (params.idempotencyKey && this.idempotencyService.has(params.idempotencyKey)) {
      const cached = this.idempotencyService.get(params.idempotencyKey);
      return cached!.body as PaymentIntent;
    }

    const intent = await this.gatewayPaymentService.createPaymentIntent(params);

    if (params.idempotencyKey) {
      this.idempotencyService.save(params.idempotencyKey, 201, intent);
    }

    return intent;
  }

  /**
   * Process incoming payment webhook with signature verification.
   */
  async processWebhook(
    eventPayload: any,
    signature: string,
    rawBody: string,
  ): Promise<WebhookProcessingResult> {
    return this.gatewayPaymentService.processWebhook(eventPayload, signature, rawBody);
  }

  /**
   * Create a direct Payment record with idempotency support.
   */
  create(dto: CreatePaymentDto, idempotencyKey?: string, actor?: { role: string; userId: number }): Payment {
    // 1. Idempotency Check
    if (idempotencyKey && this.idempotencyService.has(idempotencyKey)) {
      const cached = this.idempotencyService.get(idempotencyKey);
      return cached!.body as Payment;
    }

    if (!!dto.bookingId === !!dto.tripId) {
      throw new BadRequestException('Exactly one of bookingId or tripId must be provided.');
    }

    // A traveler payment must pay exactly what the server priced, for a booking that
    // is still awaiting payment. (Previously any amount, even Rs 1, confirmed a booking.)
    if (actor?.role === 'traveler') {
      if (!dto.bookingId) {
        throw new BadRequestException('Travelers pay for a specific booking (bookingId is required).');
      }
      if (dto.method === 'Cash') {
        throw new BadRequestException('Cash payments can only be recorded by GlobeSync staff or the partner agency.');
      }
      if (dto.status && dto.status !== 'Paid') {
        throw new BadRequestException('Only completed (Paid) payments can be recorded.');
      }
    }
    if (dto.bookingId && dto.status === 'Paid' && actor?.role !== 'admin' && actor?.role !== 'superuser') {
      const booking = bookings.find((b) => b.bookingId === dto.bookingId);
      if (!booking) throw new NotFoundException(`Booking with ID ${dto.bookingId} not found`);
      const st = String(booking.status).toUpperCase();
      if (['CANCELLED', 'EXPIRED', 'REFUNDED', 'COMPLETED'].includes(st)) {
        throw new BadRequestException(`Booking #${dto.bookingId} is ${st.toLowerCase()} and cannot be paid.`);
      }
      if (booking.holdExpiresAtUtc && st === 'HELD' && new Date(booking.holdExpiresAtUtc).getTime() < Date.now()) {
        throw new BadRequestException(`The 15-minute hold on booking #${dto.bookingId} has expired. Please create the booking again.`);
      }
      const dueMinor = booking.total_minor ?? Math.round(Number(booking.amount) * 100);
      if (Math.round(dto.amount * 100) !== dueMinor) {
        throw new BadRequestException(
          `Payment amount ₹${dto.amount.toLocaleString('en-IN')} does not match the amount due for booking #${dto.bookingId} (₹${(dueMinor / 100).toLocaleString('en-IN')}).`,
        );
      }
    }

    // Backend rule: Verify payment method is currently active in platform configuration
    if (!this.systemConfigService.isPaymentMethodActive(dto.method)) {
      throw new BadRequestException(
        `Payment method '${dto.method}' is currently disabled by platform administrator.`,
      );
    }

    // Backend rule: Enforce platform single booking transaction ceiling
    const rules = this.systemConfigService.getRules();
    if (dto.amount > rules.bookingLimit) {
      throw new BadRequestException(
        `Transaction amount ₹${dto.amount.toLocaleString('en-IN')} exceeds the platform single booking ceiling of ₹${rules.bookingLimit.toLocaleString('en-IN')}.`,
      );
    }

    // Backend rule: Prevent duplicate payment records for the same booking or trip
    if (dto.bookingId && dto.status === 'Paid') {
      const existingPaid = payments.find(
        (p) => p.bookingId === dto.bookingId && p.status === 'Paid',
      );
      if (existingPaid) {
        throw new BadRequestException(
          `Payment for Booking #${dto.bookingId} has already been recorded (Payment #${existingPaid.paymentId}). Duplicate payment rejected.`,
        );
      }
    }

    if (dto.tripId && dto.status === 'Paid') {
      const existingPaid = payments.find(
        (p) => p.tripId === dto.tripId && p.status === 'Paid',
      );
      if (existingPaid) {
        throw new BadRequestException(
          `Payment for Trip #${dto.tripId} has already been recorded (Payment #${existingPaid.paymentId}). Duplicate payment rejected.`,
        );
      }
    }

    const maxId = payments.length > 0 ? Math.max(...payments.map((p) => p.paymentId)) : 0;
    const item: Payment = {
      paymentId: maxId + 1,
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      method: dto.method as Payment['method'],
      status: (dto.status as Payment['status']) || 'Pending',
      ...(dto.bookingId !== undefined && { bookingId: dto.bookingId }),
      ...(dto.tripId !== undefined && { tripId: dto.tripId }),
      ...(dto.agencyId !== undefined && { agencyId: dto.agencyId }),
    };
    payments.push(item);

    // Revenue integration
    if (item.status === 'Paid') {
      if (item.agencyId) {
        this.revenueService.calculateAgencyCommission(item.bookingId || item.tripId || 0, item.amount, item.agencyId);
      } else {
        this.revenueService.calculateBookingCommission(item.bookingId || item.tripId || 0, item.amount);
      }

      // Operational Rule: Auto-confirm booking upon successful payment if enabled
      if (dto.bookingId && rules.autoConfirm) {
        const booking = bookings.find((b) => b.bookingId === dto.bookingId);
        if (booking && (booking.status === 'Pending' || booking.status === 'HELD')) {
          BookingStateMachine.assertValidTransition(booking.status, BookingStatus.PAID);
          booking.status = BookingStatus.PAID;
          BookingStateMachine.assertValidTransition(booking.status, BookingStatus.CONFIRMED);
          booking.status = BookingStatus.CONFIRMED;
        }
        confirmTripIfFullyPaid(booking?.tripId);
      }
    }

    if (idempotencyKey) {
      this.idempotencyService.save(idempotencyKey, 201, item);
    }

    return item;
  }
}
