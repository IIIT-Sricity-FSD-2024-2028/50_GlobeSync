import { syncAuthAccount } from '../auth/identity.util';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { travelers, Traveler } from '../data';
import { CreateTravelerDto, UpdateTravelerDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';
import { findLegacyAccount, hashLegacyPassword } from '../auth/identity.util';
import { testDb } from '../database/test-database';

@Injectable()
export class TravelersService {
  findAll(): Omit<Traveler, 'password'>[];
  findAll(query: PaginationQueryDto): Omit<Traveler, 'password'>[] | PaginatedResult<Omit<Traveler, 'password'>>;
  findAll(query?: PaginationQueryDto): any {
    const safe = travelers.map(({ password, ...rest }) => rest);
    return paginateCollection(safe, query, ['name', 'email', 'phone']);
  }

  findOne(id: number): Omit<Traveler, 'password'> {
    const traveler = travelers.find((t) => t.travelerId === id);
    if (!traveler) {
      throw new NotFoundException(`Traveler with ID ${id} not found`);
    }
    const { password, ...rest } = traveler;
    return rest;
  }

  create(dto: CreateTravelerDto): Omit<Traveler, 'password'> {
    // Check if email already registered (by any account type)
    if (
      findLegacyAccount(dto.email) ||
      testDb.users.some((u) => u.email.toLowerCase() === dto.email.toLowerCase())
    ) {
      throw new BadRequestException('Email is already registered. Please log in or use another email.');
    }

    const maxId = travelers.length > 0
      ? Math.max(...travelers.map((t) => t.travelerId))
      : 0;

    const newTraveler: Traveler = {
      travelerId: maxId + 1,
      name: dto.name,
      email: dto.email,
      password: hashLegacyPassword(dto.password),
      phone: dto.phone || '',
      gender: dto.gender || '',
      age: dto.age || 0,
    };

    travelers.push(newTraveler);
    const { password, ...rest } = newTraveler;
    return rest;
  }

  update(id: number, dto: UpdateTravelerDto): Omit<Traveler, 'password'> {
    const index = travelers.findIndex((t) => t.travelerId === id);
    if (index === -1) {
      throw new NotFoundException(`Traveler with ID ${id} not found`);
    }

    const existing = travelers[index];
    const updated: Traveler = {
      ...existing,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.password !== undefined && { password: hashLegacyPassword(dto.password) }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(dto.age !== undefined && { age: dto.age }),
    };

    travelers[index] = updated;
    syncAuthAccount(existing.email, { email: dto.email, password: dto.password });
    const { password, ...rest } = updated;
    return rest;
  }

  remove(id: number): { message: string } {
    const index = travelers.findIndex((t) => t.travelerId === id);
    if (index === -1) {
      throw new NotFoundException(`Traveler with ID ${id} not found`);
    }
    travelers.splice(index, 1);
    return { message: `Traveler with ID ${id} deleted successfully` };
  }
}
