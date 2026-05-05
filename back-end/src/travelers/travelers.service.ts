import { Injectable, NotFoundException } from '@nestjs/common';
import { travelers, Traveler } from '../data';
import { CreateTravelerDto, UpdateTravelerDto } from './dto';

@Injectable()
export class TravelersService {
  findAll(): Omit<Traveler, 'password'>[] {
    return travelers.map(({ password, ...rest }) => rest);
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
    const maxId = travelers.length > 0
      ? Math.max(...travelers.map((t) => t.travelerId))
      : 0;

    const newTraveler: Traveler = {
      travelerId: maxId + 1,
      name: dto.name,
      email: dto.email,
      password: dto.password,
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
      ...(dto.password !== undefined && { password: dto.password }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(dto.age !== undefined && { age: dto.age }),
    };

    travelers[index] = updated;
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
