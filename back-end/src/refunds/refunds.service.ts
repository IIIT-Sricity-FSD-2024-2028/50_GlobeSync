import { Injectable, NotFoundException } from '@nestjs/common';
import { refunds, Refund } from '../data';
import { CreateRefundDto } from './dto';

@Injectable()
export class RefundsService {
  findAll(): Refund[] { return refunds; }

  findOne(id: number): Refund {
    const r = refunds.find((r) => r.refundId === id);
    if (!r) throw new NotFoundException(`Refund with ID ${id} not found`);
    return r;
  }

  create(dto: CreateRefundDto): Refund {
    const maxId = refunds.length > 0 ? Math.max(...refunds.map((r) => r.refundId)) : 0;
    const item: Refund = {
      refundId: maxId + 1,
      paymentId: dto.paymentId,
      refundDate: dto.refundDate,
      refundTime: dto.refundTime || new Date().toTimeString().slice(0, 8),
      refundStatus: (dto.refundStatus as Refund['refundStatus']) || 'Processing',
    };
    refunds.push(item);
    return item;
  }

  updateStatus(id: number, status: string): Refund {
    const idx = refunds.findIndex((r) => r.refundId === id);
    if (idx === -1) throw new NotFoundException(`Refund with ID ${id} not found`);
    refunds[idx] = { ...refunds[idx], refundStatus: status as Refund['refundStatus'] };
    return refunds[idx];
  }
}
