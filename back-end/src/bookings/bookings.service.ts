import { Injectable, NotFoundException } from '@nestjs/common';
import { bookings, Booking } from '../data';
import { CreateBookingDto, UpdateBookingDto } from './dto';

@Injectable()
export class BookingsService {
  findAll(): Booking[] { return bookings; }

  findOne(id: number): Booking {
    const b = bookings.find((b) => b.bookingId === id);
    if (!b) throw new NotFoundException(`Booking with ID ${id} not found`);
    return b;
  }

  findByTraveler(travelerId: number): Booking[] {
    return bookings.filter((b) => b.travelerId === travelerId);
  }

  create(dto: CreateBookingDto): Booking {
    const maxId = bookings.length > 0 ? Math.max(...bookings.map((b) => b.bookingId)) : 0;
    const newBooking: Booking = {
      bookingId: maxId + 1,
      bookingDate: dto.bookingDate,
      status: (dto.status as Booking['status']) || 'Pending',
      tripId: dto.tripId,
      travelerId: dto.travelerId,
      service: dto.service,
      type: dto.type as Booking['type'],
      amount: dto.amount,
    };
    bookings.push(newBooking);
    return newBooking;
  }

  update(id: number, dto: UpdateBookingDto): Booking {
    const idx = bookings.findIndex((b) => b.bookingId === id);
    if (idx === -1) throw new NotFoundException(`Booking with ID ${id} not found`);
    const updated: Booking = {
      ...bookings[idx],
      ...(dto.bookingDate !== undefined && { bookingDate: dto.bookingDate }),
      ...(dto.status !== undefined && { status: dto.status as Booking['status'] }),
      ...(dto.tripId !== undefined && { tripId: dto.tripId }),
      ...(dto.travelerId !== undefined && { travelerId: dto.travelerId }),
      ...(dto.service !== undefined && { service: dto.service }),
      ...(dto.type !== undefined && { type: dto.type as Booking['type'] }),
      ...(dto.amount !== undefined && { amount: dto.amount }),
    };
    bookings[idx] = updated;
    return updated;
  }

  remove(id: number): { message: string } {
    const idx = bookings.findIndex((b) => b.bookingId === id);
    if (idx === -1) throw new NotFoundException(`Booking with ID ${id} not found`);
    bookings.splice(idx, 1);
    return { message: `Booking with ID ${id} deleted successfully` };
  }
}
