import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { agencies, Agency } from '../data';
import { CreateAgencyDto, UpdateAgencyDto, UpdateAgencyStatusDto, CreateDirectAgencyDto } from './dto';

@Injectable()
export class AgenciesService {
  findAll(): Agency[] {
    return agencies;
  }

  findOne(id: number): Agency {
    const agency = agencies.find((a) => a.agencyId === id);
    if (!agency) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }
    return agency;
  }

  create(dto: CreateAgencyDto): Agency {
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
    agencies.push(newAgency);
    return newAgency;
  }

  createDirect(dto: CreateDirectAgencyDto): Agency {
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
    agencies.push(newAgency);
    return newAgency;
  }

  update(id: number, dto: UpdateAgencyDto): Agency {
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
      ...(dto.password !== undefined && { password: dto.password }),
    };
    agencies[idx] = updated;
    return updated;
  }

  updateStatus(id: number, dto: UpdateAgencyStatusDto): Agency {
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
    return updated;
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
