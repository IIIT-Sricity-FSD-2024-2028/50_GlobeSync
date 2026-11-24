import { Injectable } from '@nestjs/common';
import { testDb } from '../database/test-database';

export interface TripEntity {
  tripId: number;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travelerId?: number;
  guideId?: number | null;
  agencyId?: number;
  packageId?: number;
  title?: string;
  status: string;
  guideStatus?: string;
  passengerIds?: number[];
  travelersCount?: number;
  transportDetails?: any;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class TripRepository {
  async findAll(filter?: {
    travelerId?: number;
    guideId?: number;
    agencyId?: number;
    status?: string;
  }): Promise<TripEntity[]> {
    let list = testDb.trips;
    if (filter?.travelerId) list = list.filter((t) => t.travelerId === filter.travelerId);
    if (filter?.guideId) list = list.filter((t) => t.guideId === filter.guideId);
    if (filter?.agencyId) list = list.filter((t) => t.agencyId === filter.agencyId);
    if (filter?.status) list = list.filter((t) => t.status?.toLowerCase() === filter.status?.toLowerCase());
    return list;
  }

  async findOne(id: number): Promise<TripEntity | null> {
    return testDb.trips.find((t) => t.tripId === id) || null;
  }

  async create(data: Partial<TripEntity>): Promise<TripEntity> {
    const maxId = testDb.trips.length > 0 ? Math.max(...testDb.trips.map((t) => t.tripId)) : 0;
    const newTrip: TripEntity = {
      tripId: maxId + 1,
      origin: data.origin || '',
      destination: data.destination || '',
      startDate: data.startDate || new Date().toISOString(),
      endDate: data.endDate || new Date().toISOString(),
      budget: data.budget || 0,
      travelerId: data.travelerId,
      guideId: data.guideId !== undefined ? data.guideId : null,
      agencyId: data.agencyId,
      packageId: data.packageId,
      title: data.title,
      status: data.status || 'Planning',
      guideStatus: data.guideStatus,
      passengerIds: data.passengerIds,
      travelersCount: data.travelersCount || 1,
      transportDetails: data.transportDetails,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    testDb.trips.push(newTrip);
    return newTrip;
  }

  async update(id: number, data: Partial<TripEntity>): Promise<TripEntity | null> {
    const idx = testDb.trips.findIndex((t) => t.tripId === id);
    if (idx === -1) return null;
    testDb.trips[idx] = {
      ...testDb.trips[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return testDb.trips[idx];
  }

  async delete(id: number): Promise<boolean> {
    const idx = testDb.trips.findIndex((t) => t.tripId === id);
    if (idx === -1) return false;
    testDb.trips.splice(idx, 1);
    return true;
  }

  async hasDependentRecords(tripId: number): Promise<boolean> {
    const hasBookings = testDb.bookings.some((b) => b.tripId === tripId);
    const hasPayments = testDb.payments.some((p) => p.tripId === tripId);
    const hasExpenses = testDb.expenses.some((e) => e.tripId === tripId);
    return hasBookings || hasPayments || hasExpenses;
  }
}
