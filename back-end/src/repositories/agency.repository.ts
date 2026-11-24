import { Injectable, BadRequestException } from '@nestjs/common';
import { testDb } from '../database/test-database';
import { Role, UserStatus, AgencyApprovalStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export interface AgencyEntity {
  agencyId: number;
  businessName: string;
  contactPerson?: string;
  contactEmail: string;
  contactPhone?: string;
  password?: string;
  password_hash?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  commissionRate: number;
  licenseGstin?: string;
  officeAddress?: string;
  payoutBankUpi?: string;
  createdAt: string;
  updatedAt?: string;
}

@Injectable()
export class AgencyRepository {
  // Backwards compatibility layer with existing tests and services
  get rawAgencies(): AgencyEntity[] {
    return this.findAllEntities();
  }

  private findAllEntities(): AgencyEntity[] {
    const agencyUsers = testDb.users.filter((u) => u.role === Role.AGENCY);
    return agencyUsers.map((u) => {
      const profile = testDb.agencyProfiles.find((p) => p.user_id === u.id);
      return {
        agencyId: u.id,
        businessName: profile?.business_name || u.name,
        contactPerson: u.name,
        contactEmail: u.email,
        contactPhone: profile?.phone || u.phone || undefined,
        password: (u as any).password || 'horizon123',
        password_hash: u.password_hash,
        status: (profile?.approval_status?.toLowerCase() || 'approved') as any,
        commissionRate: 1.5,
        licenseGstin: profile?.tax_id || 'GSTIN27AABCU9603R1ZM',
        officeAddress: profile?.address || undefined,
        payoutBankUpi: profile?.payout_bank_upi || 'horizon@hdfcbank',
        createdAt: u.created_at.toISOString(),
      };
    });
  }

  async findAll(): Promise<AgencyEntity[]> {
    return this.findAllEntities();
  }

  async findOne(id: number): Promise<AgencyEntity | null> {
    const list = this.findAllEntities();
    return list.find((a) => a.agencyId === id) || null;
  }

  async findByEmail(email: string): Promise<AgencyEntity | null> {
    const list = this.findAllEntities();
    return list.find((a) => a.contactEmail.toLowerCase() === email.toLowerCase()) || null;
  }

  async create(data: {
    businessName: string;
    contactPerson?: string;
    contactEmail: string;
    contactPhone?: string;
    password: string;
    commissionRate?: number;
    licenseGstin?: string;
    officeAddress?: string;
    payoutBankUpi?: string;
    status?: string;
  }): Promise<AgencyEntity> {
    if (this.findAllEntities().some((a) => a.contactEmail.toLowerCase() === data.contactEmail.toLowerCase())) {
      throw new BadRequestException('Email already registered');
    }

    const maxId = testDb.users.length > 0 ? Math.max(...testDb.users.map((u) => u.id)) : 0;
    const newId = maxId + 1;
    const passwordHash = bcrypt.hashSync(data.password, 10);

    const user: any = {
      id: newId,
      email: data.contactEmail,
      name: data.contactPerson || data.businessName,
      password: data.password, // preserve for plain check in old tests if tested
      password_hash: passwordHash,
      role: Role.AGENCY,
      status: UserStatus.PENDING,
      phone: data.contactPhone,
      email_verified_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    testDb.users.push(user);

    const statusEnum = data.status === 'approved' ? AgencyApprovalStatus.APPROVED : AgencyApprovalStatus.PENDING;
    testDb.agencyProfiles.push({
      id: testDb.agencyProfiles.length + 1,
      user_id: newId,
      business_name: data.businessName,
      tax_id: data.licenseGstin || 'PENDING',
      approval_status: statusEnum,
      approved_by: null,
      approved_at: null,
      payout_bank_upi: data.payoutBankUpi,
      phone: data.contactPhone,
      address: data.officeAddress,
    });

    return (await this.findOne(newId))!;
  }

  async update(id: number, data: Partial<AgencyEntity>): Promise<AgencyEntity | null> {
    const user = testDb.users.find((u) => u.id === id && u.role === Role.AGENCY);
    if (!user) return null;

    if (data.contactEmail) user.email = data.contactEmail;
    if (data.contactPerson) user.name = data.contactPerson;
    if (data.contactPhone) user.phone = data.contactPhone;
    if (data.password) {
      (user as any).password = data.password;
      user.password_hash = bcrypt.hashSync(data.password, 10);
    }

    const profile = testDb.agencyProfiles.find((p) => p.user_id === id);
    if (profile) {
      if (data.businessName) profile.business_name = data.businessName;
      if (data.licenseGstin) profile.tax_id = data.licenseGstin;
      if (data.payoutBankUpi) profile.payout_bank_upi = data.payoutBankUpi;
      if (data.officeAddress) profile.address = data.officeAddress;
      if (data.status) {
        profile.approval_status = data.status === 'approved' ? AgencyApprovalStatus.APPROVED : AgencyApprovalStatus.REJECTED;
      }
    }

    return this.findOne(id);
  }

  async delete(id: number): Promise<boolean> {
    const uIdx = testDb.users.findIndex((u) => u.id === id);
    if (uIdx === -1) return false;
    testDb.users.splice(uIdx, 1);
    const pIdx = testDb.agencyProfiles.findIndex((p) => p.user_id === id);
    if (pIdx !== -1) testDb.agencyProfiles.splice(pIdx, 1);
    return true;
  }
}
