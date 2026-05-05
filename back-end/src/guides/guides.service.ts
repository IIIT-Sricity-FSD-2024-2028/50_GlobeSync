import { Injectable, NotFoundException } from '@nestjs/common';
import { guides, Guide } from '../data';
import { CreateGuideDto, UpdateGuideDto } from './dto';

@Injectable()
export class GuidesService {
  findAll(): Omit<Guide, 'password'>[] {
    return guides.map(({ password, ...rest }) => rest);
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
      password: dto.password,
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

  update(id: number, dto: UpdateGuideDto): Omit<Guide, 'password'> {
    const index = guides.findIndex((g) => g.guideId === id);
    if (index === -1) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }

    const existing = guides[index];
    const updated: Guide = {
      ...existing,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.password !== undefined && { password: dto.password }),
      ...(dto.languages !== undefined && { languages: dto.languages }),
      ...(dto.experience !== undefined && { experience: dto.experience }),
      ...(dto.rating !== undefined && { rating: dto.rating }),
      ...(dto.pricePerTrip !== undefined && { pricePerTrip: dto.pricePerTrip }),
      ...(dto.contact !== undefined && { contact: dto.contact }),
      ...(dto.adminId !== undefined && { adminId: dto.adminId }),
    };

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
