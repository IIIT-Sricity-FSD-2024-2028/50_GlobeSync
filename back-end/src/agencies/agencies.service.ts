import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { agencies, Agency } from '../data';
import { CreateAgencyDto, UpdateAgencyDto, UpdateAgencyStatusDto, CreateDirectAgencyDto, AgencyResponseDto } from './dto';

/** Type alias for the sanitized public response shape. */
type SafeAgency = Omit<Agency, 'password'>;

@Injectable()
export class AgenciesService {
  /**
   * Strip the password from an Agency before returning it to callers.
   * This returns a new object and never mutates the stored record,
   * which must retain its password for auth.service.ts login lookups.
   */
  private sanitize(agency: Agency): SafeAgency {
    const { password: _omitted, ...safe } = agency;
    return safe;
  }

  findAll(): AgencyResponseDto[] {
    return agencies.map((a) => this.sanitize(a));
  }

  findAllLookup() {
    return agencies.map(a => ({
      agencyId: a.agencyId,
      businessName: a.businessName,
    }));
  }

  findOne(id: number): AgencyResponseDto {
    const agency = agencies.find((a) => a.agencyId === id);
    if (!agency) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }
    return this.sanitize(agency);
  }

  create(dto: CreateAgencyDto): AgencyResponseDto {
    // Check if email is already registered
    if (agencies.some(a => a.contactEmail.toLowerCase() === dto.contactEmail.toLowerCase())) {
      throw new BadRequestException('Email already registered');
    }

    const maxId = agencies.length > 0 ? Math.max(...agencies.map((a) => a.agencyId)) : 0;
    const newAgency: Agency = {
      agencyId: maxId + 1,
      businessName: dto.businessName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      password: dto.password,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    // Push the full record (with password) so auth login continues to work
    agencies.push(newAgency);
    return this.sanitize(newAgency);
  }

  createDirect(dto: CreateDirectAgencyDto): AgencyResponseDto {
    if (agencies.some(a => a.contactEmail.toLowerCase() === dto.contactEmail.toLowerCase())) {
      throw new BadRequestException('Email already registered');
    }

    const maxId = agencies.length > 0 ? Math.max(...agencies.map((a) => a.agencyId)) : 0;
    const newAgency: Agency = {
      agencyId: maxId + 1,
      businessName: dto.businessName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      password: dto.password,
      status: (dto.status as Agency['status']) || 'approved',
      ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
      createdAt: new Date().toISOString(),
    };
    // Push the full record (with password) so auth login continues to work
    agencies.push(newAgency);
    return this.sanitize(newAgency);
  }

  update(id: number, dto: UpdateAgencyDto): AgencyResponseDto {
    const idx = agencies.findIndex((a) => a.agencyId === id);
    if (idx === -1) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }

    if (dto.contactEmail && dto.contactEmail.toLowerCase() !== agencies[idx].contactEmail.toLowerCase()) {
      if (agencies.some(a => a.contactEmail.toLowerCase() === dto.contactEmail.toLowerCase())) {
        throw new BadRequestException('Email already registered');
      }
    }

    const updated: Agency = {
      ...agencies[idx],
      ...(dto.businessName !== undefined && { businessName: dto.businessName }),
      ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
      ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
      // Password update is stored in the in-memory record for auth, but never returned
      ...(dto.password !== undefined && { password: dto.password }),
    };
    agencies[idx] = updated;
    return this.sanitize(updated);
  }

  updateStatus(id: number, dto: UpdateAgencyStatusDto): AgencyResponseDto {
    const idx = agencies.findIndex((a) => a.agencyId === id);
    if (idx === -1) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }

    const updated: Agency = {
      ...agencies[idx],
      status: dto.status,
      ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
    };
    agencies[idx] = updated;
    return this.sanitize(updated);
  }

  remove(id: number): { message: string } {
    const idx = agencies.findIndex((a) => a.agencyId === id);
    if (idx === -1) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }
    // Note: We deliberately do not cascade this delete to trips, passengers,
    // or commission ledger entries. They are left in place as historical records
    // (no cascade-delete precedent exists in this system for users/agencies).
    agencies.splice(idx, 1);
    return { message: 'Agency deleted successfully' };
  }
}

