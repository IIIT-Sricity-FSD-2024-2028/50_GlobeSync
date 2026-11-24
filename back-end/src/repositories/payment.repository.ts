import { Injectable } from '@nestjs/common';
import { testDb } from '../database/test-database';

export interface PaymentEntity {
  paymentId: number;
  bookingId?: number;
  tripId?: number;
  travelerId: number;
  amount: number;
  currency?: string;
  status: string;
  paymentMethod?: string;
  transactionRef?: string;
  createdAt: string;
}

export interface RefundEntity {
  refundId: number;
  paymentId: number;
  bookingId?: number;
  travelerId: number;
  amount: number;
  reason: string;
  status: string;
  refundPercentage?: number;
  createdAt: string;
  processedAt?: string;
}

@Injectable()
export class PaymentRepository {
  async findAll(filter?: { travelerId?: number; tripId?: number; bookingId?: number }): Promise<PaymentEntity[]> {
    let list = testDb.payments;
    if (filter?.travelerId) list = list.filter((p) => p.travelerId === filter.travelerId);
    if (filter?.tripId) list = list.filter((p) => p.tripId === filter.tripId);
    if (filter?.bookingId) list = list.filter((p) => p.bookingId === filter.bookingId);
    return list;
  }

  async findOne(id: number): Promise<PaymentEntity | null> {
    return testDb.payments.find((p) => p.paymentId === id) || null;
  }

  async create(data: Partial<PaymentEntity>): Promise<PaymentEntity> {
    const maxId = testDb.payments.length > 0 ? Math.max(...testDb.payments.map((p) => p.paymentId)) : 0;
    const newPayment: PaymentEntity = {
      paymentId: maxId + 1,
      bookingId: data.bookingId,
      tripId: data.tripId,
      travelerId: data.travelerId || 1,
      amount: data.amount || 0,
      currency: data.currency || 'INR',
      status: data.status || 'Completed',
      paymentMethod: data.paymentMethod || 'UPI',
      transactionRef: data.transactionRef || `TXN-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    testDb.payments.push(newPayment);
    return newPayment;
  }
}

@Injectable()
export class RefundRepository {
  async findAll(filter?: { travelerId?: number; paymentId?: number }): Promise<RefundEntity[]> {
    let list = testDb.refunds;
    if (filter?.travelerId) list = list.filter((r) => r.travelerId === filter.travelerId);
    if (filter?.paymentId) list = list.filter((r) => r.paymentId === filter.paymentId);
    return list;
  }

  async findOne(id: number): Promise<RefundEntity | null> {
    return testDb.refunds.find((r) => r.refundId === id) || null;
  }

  async create(data: Partial<RefundEntity>): Promise<RefundEntity> {
    const maxId = testDb.refunds.length > 0 ? Math.max(...testDb.refunds.map((r) => r.refundId)) : 0;
    const newRefund: RefundEntity = {
      refundId: maxId + 1,
      paymentId: data.paymentId || 1,
      bookingId: data.bookingId,
      travelerId: data.travelerId || 1,
      amount: data.amount || 0,
      reason: data.reason || 'Requested by traveler',
      status: data.status || 'Pending',
      refundPercentage: data.refundPercentage || 0,
      createdAt: new Date().toISOString(),
    };
    testDb.refunds.push(newRefund);
    return newRefund;
  }

  async update(id: number, data: Partial<RefundEntity>): Promise<RefundEntity | null> {
    const idx = testDb.refunds.findIndex((r) => r.refundId === id);
    if (idx === -1) return null;
    testDb.refunds[idx] = { ...testDb.refunds[idx], ...data };
    return testDb.refunds[idx];
  }
}
