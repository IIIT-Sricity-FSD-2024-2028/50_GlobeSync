import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { payments, Payment, bookings } from '../data';
import { CreatePaymentDto } from './dto';
import { RevenueService } from '../revenue/revenue.service';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly revenueService: RevenueService,
    private readonly systemConfigService: SystemConfigService,
  ) {}
  findAll(): Payment[] { return payments; }

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

  create(dto: CreatePaymentDto): Payment {
    if (!!dto.bookingId === !!dto.tripId) {
      throw new BadRequestException('Exactly one of bookingId or tripId must be provided.');
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
        if (booking && booking.status === 'Pending') {
          booking.status = 'Confirmed';
        }
      }
    }
    
    return item;
  }
}
