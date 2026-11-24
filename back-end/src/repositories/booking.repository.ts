import { Injectable } from '@nestjs/common';
import { testDb } from '../database/test-database';

export interface BookingEntity {
  bookingId: number;
  bookingDate: string;
  status: string;
  tripId?: number;
  travelerId?: number;
  agencyId?: number;
  packageId?: number;
  service?: string;
  type?: string;
  amount: number;
  currency?: string;
  policySnapshot?: any;
}

@Injectable()
export class BookingRepository {
  async findAll(filter?: {
    travelerId?: number;
    agencyId?: number;
    tripId?: number;
    status?: string;
  }): Promise<BookingEntity[]> {
    let list = testDb.bookings;
    if (filter?.travelerId) list = list.filter((b) => b.travelerId === filter.travelerId);
    if (filter?.agencyId) list = list.filter((b) => b.agencyId === filter.agencyId);
    if (filter?.tripId) list = list.filter((b) => b.tripId === filter.tripId);
    if (filter?.status) list = list.filter((b) => b.status?.toLowerCase() === filter.status?.toLowerCase());
    return list;
  }

  async findOne(id: number): Promise<BookingEntity | null> {
    return testDb.bookings.find((b) => b.bookingId === id) || null;
  }

  async create(data: Partial<BookingEntity>): Promise<BookingEntity> {
    const maxId = testDb.bookings.length > 0 ? Math.max(...testDb.bookings.map((b) => b.bookingId)) : 0;
    const newBooking: BookingEntity = {
      bookingId: maxId + 1,
      bookingDate: data.bookingDate || new Date().toISOString(),
      status: data.status || 'Confirmed',
      tripId: data.tripId,
      travelerId: data.travelerId,
      agencyId: data.agencyId,
      packageId: data.packageId,
      service: data.service || 'Tour Service',
      type: data.type || 'Activity',
      amount: data.amount || 0,
      currency: data.currency || 'INR',
      policySnapshot: data.policySnapshot,
    };
    testDb.bookings.push(newBooking);
    return newBooking;
  }

  async update(id: number, data: Partial<BookingEntity>): Promise<BookingEntity | null> {
    const idx = testDb.bookings.findIndex((b) => b.bookingId === id);
    if (idx === -1) return null;
    testDb.bookings[idx] = { ...testDb.bookings[idx], ...data };
    return testDb.bookings[idx];
  }

  async delete(id: number): Promise<boolean> {
    const idx = testDb.bookings.findIndex((b) => b.bookingId === id);
    if (idx === -1) return false;
    testDb.bookings.splice(idx, 1);
    return true;
  }
}
