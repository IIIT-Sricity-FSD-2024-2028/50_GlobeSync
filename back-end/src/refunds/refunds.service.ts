import { Injectable, NotFoundException } from '@nestjs/common';
import { refunds, Refund } from '../data';
import { CreateRefundDto } from './dto';
import { PaymentsService } from '../payments/payments.service';
import { RevenueService } from '../revenue/revenue.service';

@Injectable()
export class RefundsService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly revenueService: RevenueService
  ) {}
  findAll(): Refund[] { return refunds; }

  findOne(id: number): Refund {
    const r = refunds.find((r) => r.refundId === id);
    if (!r) throw new NotFoundException(`Refund with ID ${id} not found`);
    return r;
  }

  findByAgency(agencyId: number): Refund[] {
    return refunds.filter((r) => r.agencyId === agencyId);
  }

  create(dto: CreateRefundDto): Refund {
    const maxId = refunds.length > 0 ? Math.max(...refunds.map((r) => r.refundId)) : 0;
    const item: Refund = {
      refundId: maxId + 1,
      paymentId: dto.paymentId,
      refundDate: dto.refundDate,
      refundTime: dto.refundTime || new Date().toTimeString().slice(0, 8),
      refundStatus: (dto.refundStatus as Refund['refundStatus']) || 'Processing',
      ...(dto.agencyId !== undefined && { agencyId: dto.agencyId }),
    };
    refunds.push(item);
    return item;
  }

  updateStatus(id: number, status: string): Refund {
    const idx = refunds.findIndex((r) => r.refundId === id);
    if (idx === -1) throw new NotFoundException(`Refund with ID ${id} not found`);
    refunds[idx] = { ...refunds[idx], refundStatus: status as Refund['refundStatus'] };
    
    // Revenue integration
    if (status === 'Completed') {
      try {
        const payment = this.paymentsService.findOne(refunds[idx].paymentId);
        if (payment && (payment.bookingId || payment.tripId)) {
          this.revenueService.refundRevenue(payment.bookingId || payment.tripId || 0);
        }
      } catch (e) {
        // Payment not found or error fetching it, just ignore
      }
    }

    return refunds[idx];
  }
}
