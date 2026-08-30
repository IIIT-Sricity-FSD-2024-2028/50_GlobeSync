import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { trips, Trip, commissionLedger, agencies, payments } from '../data';
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

  findByAgency(agencyId: number): Trip[] {
    return trips.filter((t) => t.agencyId === agencyId);
  }

  create(dto: CreateTripDto): Trip {
    if (!!dto.travelerId === !!dto.agencyId) {
      throw new BadRequestException('Exactly one of travelerId or agencyId must be provided.');
    }

    const maxId = trips.length > 0 ? Math.max(...trips.map((t) => t.tripId)) : 0;
    const newTrip: Trip = {
      tripId: maxId + 1,
      destination: dto.destination,
      startDate: dto.startDate,
      endDate: dto.endDate,
      budget: dto.budget,
      travelerId: dto.travelerId,
      agencyId: dto.agencyId,
      guideId: dto.guideId ?? null,
      packageId: dto.packageId,
      status: (dto.status as Trip['status']) || 'Planning',
    };
    trips.push(newTrip);

    if (dto.agencyId) {
      const agency = agencies.find(a => a.agencyId === dto.agencyId);
      if (agency && agency.commissionRate != null) {
        const commAmount = (dto.budget * agency.commissionRate) / 100;
        const commId = commissionLedger.length > 0 ? Math.max(...commissionLedger.map(c => c.commissionId)) : 0;
        commissionLedger.push({
          commissionId: commId + 1,
          agencyId: dto.agencyId,
          tripId: newTrip.tripId,
          grossAmount: dto.budget,
          commissionAmount: commAmount,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      // Create Payment record for agency-owned trip
      const paymentId = payments.length > 0 ? Math.max(...payments.map(p => p.paymentId)) : 0;
      payments.push({
        paymentId: paymentId + 1,
        amount: dto.budget,
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'Card', // default/assumed for agency platform billing
        status: 'Paid',
        tripId: newTrip.tripId,
        agencyId: dto.agencyId
      });
    }

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
      ...(dto.agencyId !== undefined && { agencyId: dto.agencyId }),
      ...(dto.guideId !== undefined && { guideId: dto.guideId }),
      ...(dto.packageId !== undefined && { packageId: dto.packageId }),
      ...(dto.status !== undefined && { status: dto.status as Trip['status'] }),
    };
    trips[idx] = updated;

    // When a trip is updated to completed, settle all pending commission entries for it
    if (dto.status === 'Completed') {
      commissionLedger.forEach((entry, i) => {
        if (entry.tripId === id && entry.status === 'pending') {
          commissionLedger[i] = { ...entry, status: 'settled' };
        }
      });
    }

    return updated;
  }

  updateStatus(id: number, status: string): Trip {
    const idx = trips.findIndex((t) => t.tripId === id);
    if (idx === -1) throw new NotFoundException(`Trip with ID ${id} not found`);
    trips[idx] = { ...trips[idx], status: status as Trip['status'] };

    // When a trip is completed, settle all pending commission entries for it
    if (status === 'Completed') {
      commissionLedger.forEach((entry, i) => {
        if (entry.tripId === id && entry.status === 'pending') {
          commissionLedger[i] = { ...entry, status: 'settled' };
        }
      });
    }

    return trips[idx];
  }

  remove(id: number): { message: string } {
    const idx = trips.findIndex((t) => t.tripId === id);
    if (idx === -1) throw new NotFoundException(`Trip with ID ${id} not found`);
    trips.splice(idx, 1);
    return { message: `Trip with ID ${id} deleted successfully` };
  }
}
