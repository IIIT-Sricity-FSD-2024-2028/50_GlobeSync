import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { itineraries, Itinerary, trips } from '../data';
import { CreateItineraryDto, UpdateItineraryDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';

@Injectable()
export class ItinerariesService {
  findByTrip(tripId: number, query?: PaginationQueryDto): Itinerary[] | PaginatedResult<Itinerary> {
    const list = itineraries.filter((i) => i.tripId === tripId);
    return paginateCollection(list, query, ['city', 'activity']);
  }

  private assertTripEditable(tripId: number): void {
    const trip = trips.find((t) => t.tripId === tripId);
    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }
    if (['Cancelled', 'Completed'].includes(trip.status)) {
      throw new BadRequestException(
        `Trip #${tripId} is ${trip.status.toLowerCase()}; itinerary activities are read-only and cannot be modified.`,
      );
    }
  }

  create(dto: CreateItineraryDto): Itinerary {
    this.assertTripEditable(dto.tripId);
    const maxId = itineraries.length > 0 ? Math.max(...itineraries.map((i) => i.itineraryId)) : 0;
    const item: Itinerary = {
      itineraryId: maxId + 1,
      tripId: dto.tripId,
      city: dto.city,
      dayNumber: dto.dayNumber,
      activity: dto.activity,
      activityStatus: (dto.activityStatus as Itinerary['activityStatus']) || 'Pending',
      time: dto.time,
      suggestedBy: dto.suggestedBy,
      suggestionStatus: dto.suggestionStatus,
      notes: dto.notes,
      estimatedCost: dto.estimatedCost,
    };
    itineraries.push(item);
    return item;
  }

  update(id: number, dto: UpdateItineraryDto): Itinerary {
    const idx = itineraries.findIndex((i) => i.itineraryId === id);
    if (idx === -1) throw new NotFoundException(`Itinerary with ID ${id} not found`);
    this.assertTripEditable(itineraries[idx].tripId);
    if (dto.tripId !== undefined && dto.tripId !== itineraries[idx].tripId) {
      this.assertTripEditable(dto.tripId);
    }
    const updated: Itinerary = {
      ...itineraries[idx],
      ...(dto.tripId !== undefined && { tripId: dto.tripId }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.dayNumber !== undefined && { dayNumber: dto.dayNumber }),
      ...(dto.activity !== undefined && { activity: dto.activity }),
      ...(dto.activityStatus !== undefined && { activityStatus: dto.activityStatus as Itinerary['activityStatus'] }),
      ...(dto.time !== undefined && { time: dto.time }),
      ...(dto.suggestedBy !== undefined && { suggestedBy: dto.suggestedBy }),
      ...(dto.suggestionStatus !== undefined && { suggestionStatus: dto.suggestionStatus }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.estimatedCost !== undefined && { estimatedCost: dto.estimatedCost }),
    };
    itineraries[idx] = updated;
    return updated;
  }

  remove(id: number): { message: string } {
    const idx = itineraries.findIndex((i) => i.itineraryId === id);
    if (idx === -1) throw new NotFoundException(`Itinerary with ID ${id} not found`);
    this.assertTripEditable(itineraries[idx].tripId);
    itineraries.splice(idx, 1);
    return { message: `Itinerary with ID ${id} deleted successfully` };
  }
}
