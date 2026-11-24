import { Injectable, NotFoundException } from '@nestjs/common';
import { itineraries, Itinerary } from '../data';
import { CreateItineraryDto, UpdateItineraryDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';

@Injectable()
export class ItinerariesService {
  findByTrip(tripId: number, query?: PaginationQueryDto): Itinerary[] | PaginatedResult<Itinerary> {
    const list = itineraries.filter((i) => i.tripId === tripId);
    return paginateCollection(list, query, ['city', 'activity']);
  }

  create(dto: CreateItineraryDto): Itinerary {
    const maxId = itineraries.length > 0 ? Math.max(...itineraries.map((i) => i.itineraryId)) : 0;
    const item: Itinerary = {
      itineraryId: maxId + 1,
      tripId: dto.tripId,
      city: dto.city,
      dayNumber: dto.dayNumber,
      activity: dto.activity,
      activityStatus: (dto.activityStatus as Itinerary['activityStatus']) || 'Pending',
      time: dto.time,
    };
    itineraries.push(item);
    return item;
  }

  update(id: number, dto: UpdateItineraryDto): Itinerary {
    const idx = itineraries.findIndex((i) => i.itineraryId === id);
    if (idx === -1) throw new NotFoundException(`Itinerary with ID ${id} not found`);
    const updated: Itinerary = {
      ...itineraries[idx],
      ...(dto.tripId !== undefined && { tripId: dto.tripId }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.dayNumber !== undefined && { dayNumber: dto.dayNumber }),
      ...(dto.activity !== undefined && { activity: dto.activity }),
      ...(dto.activityStatus !== undefined && { activityStatus: dto.activityStatus as Itinerary['activityStatus'] }),
      ...(dto.time !== undefined && { time: dto.time }),
    };
    itineraries[idx] = updated;
    return updated;
  }

  remove(id: number): { message: string } {
    const idx = itineraries.findIndex((i) => i.itineraryId === id);
    if (idx === -1) throw new NotFoundException(`Itinerary with ID ${id} not found`);
    itineraries.splice(idx, 1);
    return { message: `Itinerary with ID ${id} deleted successfully` };
  }
}
