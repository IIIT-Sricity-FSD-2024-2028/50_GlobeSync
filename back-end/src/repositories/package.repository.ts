import { Injectable } from '@nestjs/common';
import { testDb } from '../database/test-database';

export interface PackageEntity {
  packageId: number;
  title: string;
  destination: string;
  price: number;
  duration: string;
  rating?: number;
  reviewsCount?: number;
  featured?: boolean;
  agencyId?: number;
  createdAt?: string;
}

@Injectable()
export class PackageRepository {
  async findAll(): Promise<PackageEntity[]> {
    return testDb.packages;
  }

  async findOne(id: number): Promise<PackageEntity | null> {
    return testDb.packages.find((p) => p.packageId === id) || null;
  }

  async create(data: Partial<PackageEntity>): Promise<PackageEntity> {
    const maxId = testDb.packages.length > 0 ? Math.max(...testDb.packages.map((p) => p.packageId)) : 0;
    const newPkg: PackageEntity = {
      packageId: maxId + 1,
      title: data.title || '',
      destination: data.destination || '',
      price: data.price || 0,
      duration: data.duration || '3 Days',
      rating: data.rating || 5.0,
      reviewsCount: data.reviewsCount || 0,
      featured: data.featured || false,
      agencyId: data.agencyId,
      createdAt: new Date().toISOString(),
    };
    testDb.packages.push(newPkg);
    return newPkg;
  }

  async update(id: number, data: Partial<PackageEntity>): Promise<PackageEntity | null> {
    const idx = testDb.packages.findIndex((p) => p.packageId === id);
    if (idx === -1) return null;
    testDb.packages[idx] = { ...testDb.packages[idx], ...data };
    return testDb.packages[idx];
  }

  async delete(id: number): Promise<boolean> {
    const idx = testDb.packages.findIndex((p) => p.packageId === id);
    if (idx === -1) return false;
    testDb.packages.splice(idx, 1);
    return true;
  }

  async isReferenced(packageId: number): Promise<boolean> {
    const referencedInTrips = testDb.trips.some((t) => t.packageId === packageId);
    const referencedInBookings = testDb.bookings.some((b) => b.packageId === packageId);
    return referencedInTrips || referencedInBookings;
  }
}
