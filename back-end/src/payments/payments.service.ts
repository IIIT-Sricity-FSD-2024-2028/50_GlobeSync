import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { payments, Payment } from '../data';
import { CreatePaymentDto } from './dto';
import { RevenueService } from '../revenue/revenue.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly revenueService: RevenueService) {}
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
    }
    
    return item;
  }
}
