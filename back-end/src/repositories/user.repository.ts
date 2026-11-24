import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { testDb } from '../database/test-database';
import { Role, UserStatus } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma?: PrismaService) {}

  async findByEmail(email: string) {
    if (!email) return null;
    const lower = email.toLowerCase().trim();
    return testDb.users.find((u) => u.email.toLowerCase().trim() === lower) || null;
  }

  async findById(id: number) {
    return testDb.users.find((u) => u.id === id) || null;
  }

  async findAll(filter?: { role?: Role; status?: UserStatus }) {
    let list = testDb.users;
    if (filter?.role) list = list.filter((u) => u.role === filter.role);
    if (filter?.status) list = list.filter((u) => u.status === filter.status);
    return list;
  }

  async create(data: {
    email: string;
    password_hash: string;
    name: string;
    role: Role;
    status?: UserStatus;
    phone?: string;
    gender?: string;
    age?: number;
    email_verified_at?: Date | null;
  }) {
    const maxId = testDb.users.length > 0 ? Math.max(...testDb.users.map((u) => u.id)) : 0;
    const newRecord = {
      id: maxId + 1,
      email: data.email,
      password_hash: data.password_hash,
      name: data.name,
      role: data.role,
      status: data.status || UserStatus.ACTIVE,
      phone: data.phone,
      gender: data.gender,
      age: data.age,
      email_verified_at: data.email_verified_at || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    testDb.users.push(newRecord);
    return newRecord;
  }

  async update(id: number, data: Partial<any>) {
    const idx = testDb.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    testDb.users[idx] = {
      ...testDb.users[idx],
      ...data,
      updated_at: new Date(),
    };
    return testDb.users[idx];
  }

  async delete(id: number) {
    const idx = testDb.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    testDb.users.splice(idx, 1);
    return true;
  }
}
