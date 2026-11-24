import { syncAuthAccount } from '../auth/identity.util';
import { hashLegacyPassword } from '../auth/identity.util';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { guides, Guide } from '../data';
import { CreateGuideDto, UpdateGuideDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';

@Injectable()
export class GuidesService {
  findAll(): Omit<Guide, 'password'>[];
  findAll(query: PaginationQueryDto): Omit<Guide, 'password'>[] | PaginatedResult<Omit<Guide, 'password'>>;
  findAll(query?: PaginationQueryDto): any {
    const safeGuides = guides.map(({ password, ...rest }) => rest);
    return paginateCollection(safeGuides, query, ['name', 'email', 'contact']);
  }

  findOne(id: number): Omit<Guide, 'password'> {
    const guide = guides.find((g) => g.guideId === id);
    if (!guide) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }
    const { password, ...rest } = guide;
    return rest;
  }

  create(dto: CreateGuideDto): Omit<Guide, 'password'> {
    const maxId = guides.length > 0
      ? Math.max(...guides.map((g) => g.guideId))
      : 0;

    const newGuide: Guide = {
      guideId: maxId + 1,
      name: dto.name,
      email: dto.email,
      password: hashLegacyPassword(dto.password),
      languages: dto.languages || [],
      experience: dto.experience || 0,
      rating: dto.rating || 0,
      pricePerTrip: dto.pricePerTrip || 0,
      contact: dto.contact || '',
      adminId: dto.adminId || 1,
      role: 'guide',
    };

    guides.push(newGuide);
    const { password, ...rest } = newGuide;
    return rest;
  }

  /**
   * Update guide profile.
   * If caller is a GUIDE, rate and experience are strictly READ-ONLY (enforced on API).
   */
  update(
    id: number,
    dto: UpdateGuideDto,
    callerRole?: string,
  ): Omit<Guide, 'password'> {
    const index = guides.findIndex((g) => g.guideId === id);
    if (index === -1) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }

    const isGuideCaller = callerRole?.toLowerCase() === 'guide';

    const existing = guides[index];
    const updated: Guide = {
      ...existing,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.password !== undefined && { password: hashLegacyPassword(dto.password) }),
      ...(dto.languages !== undefined && { languages: dto.languages }),
      // Rate, rating, and experience are immutable by Guides
      ...(!isGuideCaller && dto.experience !== undefined && { experience: dto.experience }),
      ...(!isGuideCaller && dto.rating !== undefined && { rating: dto.rating }),
      ...(!isGuideCaller && dto.pricePerTrip !== undefined && { pricePerTrip: dto.pricePerTrip }),
      ...(!isGuideCaller && (dto as any).rate !== undefined && { pricePerTrip: (dto as any).rate }),
      ...(!isGuideCaller && (dto as any).adminSetRateMinor !== undefined && { pricePerTrip: Math.round((dto as any).adminSetRateMinor / 100) }),
      ...(!isGuideCaller && (dto as any).verifiedExperienceYears !== undefined && { experience: (dto as any).verifiedExperienceYears }),
      ...(dto.contact !== undefined && { contact: dto.contact }),
      ...(!isGuideCaller && dto.adminId !== undefined && { adminId: dto.adminId }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.specialties !== undefined && { specialties: dto.specialties }),
      ...(dto.availability !== undefined && { availability: dto.availability }),
    };

    syncAuthAccount(existing.email, { email: dto.email, password: dto.password });
    guides[index] = updated;
    const { password, ...rest } = updated;
    return rest;
  }

  remove(id: number): { message: string } {
    const index = guides.findIndex((g) => g.guideId === id);
    if (index === -1) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }
    guides.splice(index, 1);
    return { message: `Guide with ID ${id} deleted successfully` };
  }
}
