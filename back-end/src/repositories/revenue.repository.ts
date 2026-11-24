import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { testDb } from '../database/test-database';

@Injectable()
export class RevenueRepository {
  getConfig() {
    return { ...testDb.systemConfigs };
  }

  updateConfig(key: string, value: any) {
    if (value === undefined || value === null || isNaN(Number(value))) {
      throw new BadRequestException('Config value must be a valid number');
    }
    const num = Number(value);
    if (num < 0 || num > 100) {
      throw new BadRequestException('Config value must be between 0 and 100');
    }
    testDb.systemConfigs[key] = num;
    return { key, value: num };
  }

  getCommissions(agencyId?: number) {
    let list = testDb.commissions;
    if (agencyId) {
      list = list.filter((c) => c.agencyId === agencyId);
    }
    return list;
  }

  addCommission(data: any) {
    const maxId = testDb.commissions.length > 0 ? Math.max(...testDb.commissions.map((c) => c.commissionId || c.id || 0)) : 0;
    const entry = {
      commissionId: maxId + 1,
      id: maxId + 1,
      ...data,
      createdAt: new Date().toISOString(),
    };
    testDb.commissions.push(entry);
    return entry;
  }
}

@Injectable()
export class ReviewRepository {
  async findAll(filter?: { travelerId?: number; guideId?: number; tripId?: number }) {
    let list = testDb.reviews;
    if (filter?.travelerId) list = list.filter((r) => r.travelerId === filter.travelerId);
    if (filter?.guideId) list = list.filter((r) => r.guideId === filter.guideId);
    if (filter?.tripId) list = list.filter((r) => r.tripId === filter.tripId);
    return list;
  }

  async findOne(id: number) {
    return testDb.reviews.find((r) => r.reviewId === id) || null;
  }

  async create(data: any) {
    const maxId = testDb.reviews.length > 0 ? Math.max(...testDb.reviews.map((r) => r.reviewId || 0)) : 0;
    const review = {
      reviewId: maxId + 1,
      ...data,
      createdAt: new Date().toISOString(),
    };
    testDb.reviews.push(review);
    return review;
  }
}

@Injectable()
export class SystemConfigRepository {
  get(key: string) {
    return testDb.systemConfigs[key] || null;
  }

  set(key: string, value: any) {
    testDb.systemConfigs[key] = value;
    return value;
  }

  getAll() {
    return { ...testDb.systemConfigs };
  }
}
