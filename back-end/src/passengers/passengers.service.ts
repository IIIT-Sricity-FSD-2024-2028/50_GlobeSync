import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { passengers, Passenger } from '../data';
import { CreatePassengerDto, UpdatePassengerDto } from './dto';

@Injectable()
export class PassengersService {
  findAll(): Passenger[] {
    return passengers;
  }

  findOne(id: number): Passenger {
    const passenger = passengers.find((p) => p.passId === id);
    if (!passenger) {
      throw new NotFoundException(`Passenger with ID ${id} not found`);
    }
    return passenger;
  }

  findByTraveler(travelerId: number): Passenger[] {
    return passengers.filter((p) => p.travelerId === travelerId);
  }

  findByAgency(agencyId: number): Passenger[] {
    return passengers.filter((p) => p.agencyId === agencyId);
  }

  create(dto: CreatePassengerDto): Passenger {
    if (!!dto.travelerId === !!dto.agencyId) {
      throw new BadRequestException('Exactly one of travelerId or agencyId must be provided.');
    }

    const maxId = passengers.length > 0 ? Math.max(...passengers.map((p) => p.passId)) : 0;
    const newPassenger: Passenger = {
      passId: maxId + 1,
      name: dto.name,
      age: dto.age,
      gender: dto.gender,
      travelerId: dto.travelerId,
      agencyId: dto.agencyId,
    };
    passengers.push(newPassenger);
    return newPassenger;
  }

  update(id: number, dto: UpdatePassengerDto): Passenger {
    const idx = passengers.findIndex((p) => p.passId === id);
    if (idx === -1) {
      throw new NotFoundException(`Passenger with ID ${id} not found`);
    }

    if (dto.travelerId !== undefined || dto.agencyId !== undefined) {
      const tId = dto.travelerId !== undefined ? dto.travelerId : passengers[idx].travelerId;
      const aId = dto.agencyId !== undefined ? dto.agencyId : passengers[idx].agencyId;
      if (!!tId === !!aId) {
        throw new BadRequestException('Exactly one of travelerId or agencyId must be present.');
      }
    }

    const updated: Passenger = {
      ...passengers[idx],
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.age !== undefined && { age: dto.age }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(dto.travelerId !== undefined && { travelerId: dto.travelerId }),
      ...(dto.agencyId !== undefined && { agencyId: dto.agencyId }),
    };
    passengers[idx] = updated;
    return updated;
  }

  remove(id: number): { message: string } {
    const idx = passengers.findIndex((p) => p.passId === id);
    if (idx === -1) throw new NotFoundException(`Passenger with ID ${id} not found`);
    passengers.splice(idx, 1);
    return { message: `Passenger with ID ${id} deleted successfully` };
  }
}
