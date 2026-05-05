import { Injectable, NotFoundException } from '@nestjs/common';
import { trips, Trip } from '../data';
import { CreateTripDto, UpdateTripDto } from './dto';

@Injectable()
export class TripsService {
  findAll(): Trip[] { return trips; }

  findOne(id: number): Trip {
    const trip = trips.find((t) => t.tripId === id);
    if (!trip) throw new NotFoundException(`Trip with ID ${id} not found`);
    return trip;
  }

  findByTraveler(travelerId: number): Trip[] {
    return trips.filter((t) => t.travelerId === travelerId);
  }

  findByGuide(guideId: number): Trip[] {
    return trips.filter((t) => t.guideId === guideId);
  }

  create(dto: CreateTripDto): Trip {
    const maxId = trips.length > 0 ? Math.max(...trips.map((t) => t.tripId)) : 0;
    const newTrip: Trip = {
      tripId: maxId + 1,
      destination: dto.destination,
      startDate: dto.startDate,
      endDate: dto.endDate,
      budget: dto.budget,
      travelerId: dto.travelerId,
      guideId: dto.guideId ?? null,
      packageId: dto.packageId,
      status: (dto.status as Trip['status']) || 'Planning',
    };
    trips.push(newTrip);
    return newTrip;
  }

  update(id: number, dto: UpdateTripDto): Trip {
    const idx = trips.findIndex((t) => t.tripId === id);
    if (idx === -1) throw new NotFoundException(`Trip with ID ${id} not found`);
    const updated: Trip = {
      ...trips[idx],
      ...(dto.destination !== undefined && { destination: dto.destination }),
      ...(dto.startDate !== undefined && { startDate: dto.startDate }),
      ...(dto.endDate !== undefined && { endDate: dto.endDate }),
      ...(dto.budget !== undefined && { budget: dto.budget }),
      ...(dto.travelerId !== undefined && { travelerId: dto.travelerId }),
      ...(dto.guideId !== undefined && { guideId: dto.guideId }),
      ...(dto.packageId !== undefined && { packageId: dto.packageId }),
      ...(dto.status !== undefined && { status: dto.status as Trip['status'] }),
    };
    trips[idx] = updated;
    return updated;
  }

  updateStatus(id: number, status: string): Trip {
    const idx = trips.findIndex((t) => t.tripId === id);
    if (idx === -1) throw new NotFoundException(`Trip with ID ${id} not found`);
    trips[idx] = { ...trips[idx], status: status as Trip['status'] };
    return trips[idx];
  }

  remove(id: number): { message: string } {
    const idx = trips.findIndex((t) => t.tripId === id);
    if (idx === -1) throw new NotFoundException(`Trip with ID ${id} not found`);
    trips.splice(idx, 1);
    return { message: `Trip with ID ${id} deleted successfully` };
  }
}
