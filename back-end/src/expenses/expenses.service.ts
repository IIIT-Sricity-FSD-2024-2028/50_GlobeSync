import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { expenses, Expense, bookings, trips } from '../data';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';

export interface BudgetGauge {
  tripId: number;
  destination: string;
  budget: number;
  totalExpenses: number;
  remaining: number;
  percentageUsed: number;
  status: 'on_track' | 'warning' | 'over_budget';
  breakdown: {
    manualExpenses: number;
    bookingExpenses: number;
  };
}

@Injectable()
export class ExpensesService {
  findByTrip(tripId: number): Expense[];
  findByTrip(tripId: number, query: PaginationQueryDto): Expense[] | PaginatedResult<Expense>;
  findByTrip(tripId: number, query?: PaginationQueryDto): any {
    const manualExpenses = expenses.filter((e) => e.tripId === tripId);

    // Auto-include confirmed bookings as expenses
    const bookingExpenses: Expense[] = bookings
      .filter((b) => b.tripId === tripId && (b.status === 'Confirmed' || b.status === 'CONFIRMED' || b.status === 'PAID'))
      .map((b) => ({
        expenseId: 100000 + b.bookingId, // Offset ID to avoid conflicts with manual expenses
        amount: b.amount,
        type: (b.type as Expense['type']) || 'Other',
        tripId: b.tripId,
        bookingId: b.bookingId,
        description: b.service || `Booking #${b.bookingId} (${b.type})`,
      }));

    const combined = [...manualExpenses, ...bookingExpenses];
    return paginateCollection(combined, query, ['description', 'type']);
  }

  /**
   * Budget gauge computed from real expenses vs real budget.
   * Real App Parity: Never hardcoded, never faked.
   */
  getBudgetGauge(tripId: number): BudgetGauge {
    const trip = trips.find((t) => t.tripId === tripId);
    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    const tripBudget = Number(trip.budget) || 0;

    // Manual expenses for this trip
    const manualList = expenses.filter((e) => e.tripId === tripId);
    const manualTotal = manualList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Confirmed bookings for this trip
    const confirmedBookings = bookings.filter(
      (b) => b.tripId === tripId && (b.status === 'Confirmed' || b.status === 'CONFIRMED' || b.status === 'PAID'),
    );
    const bookingTotal = confirmedBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    const totalExpenses = manualTotal + bookingTotal;
    const remaining = tripBudget - totalExpenses;
    const percentageUsed = tripBudget > 0 ? Math.round((totalExpenses / tripBudget) * 100) : 0;

    let status: 'on_track' | 'warning' | 'over_budget' = 'on_track';
    if (totalExpenses > tripBudget) {
      status = 'over_budget';
    } else if (percentageUsed >= 85) {
      status = 'warning';
    }

    return {
      tripId,
      destination: trip.destination,
      budget: tripBudget,
      totalExpenses,
      remaining,
      percentageUsed,
      status,
      breakdown: {
        manualExpenses: manualTotal,
        bookingExpenses: bookingTotal,
      },
    };
  }

  create(dto: CreateExpenseDto): Expense {
    let resolvedTripId = dto.tripId;

    if (dto.bookingId) {
      const booking = bookings.find((b) => b.bookingId === dto.bookingId);
      if (!booking) {
        throw new NotFoundException(`Booking with ID ${dto.bookingId} not found`);
      }
      if (!resolvedTripId) {
        resolvedTripId = booking.tripId;
      }
    }

    if (!resolvedTripId) {
      throw new BadRequestException('Either tripId or bookingId must be provided');
    }

    const maxId = expenses.length > 0 ? Math.max(...expenses.map((e) => e.expenseId)) : 0;
    const item: Expense = {
      expenseId: maxId + 1,
      amount: dto.amount,
      type: dto.type as Expense['type'],
      tripId: resolvedTripId,
      bookingId: dto.bookingId,
      description: dto.description,
      category: dto.category,
      receiptUrl: dto.receiptUrl,
      createdAt: new Date().toISOString(),
    };
    expenses.push(item);
    return item;
  }

  update(id: number, dto: UpdateExpenseDto): Expense {
    if (id >= 100000) {
      // Ids from 100000 are booked items shown from the bookings list (see findByTrip).
      throw new BadRequestException('This is a booked item. Its price and category come from the booking and cannot be edited.');
    }
    const idx = expenses.findIndex((e) => e.expenseId === id);
    if (idx === -1) throw new NotFoundException(`Expense with ID ${id} not found`);
    if (expenses[idx].bookingId) {
      const locked = (['amount', 'type', 'tripId', 'bookingId'] as const).filter(
        (k) => (dto as any)[k] !== undefined && (dto as any)[k] !== (expenses[idx] as any)[k],
      );
      if (locked.length) {
        throw new BadRequestException(`This expense is linked to a booking. Not allowed to change: ${locked.join(', ')}.`);
      }
    }
    const updated: Expense = {
      ...expenses[idx],
      ...(dto.amount !== undefined && { amount: dto.amount }),
      ...(dto.type !== undefined && { type: dto.type as Expense['type'] }),
      ...(dto.tripId !== undefined && { tripId: dto.tripId }),
      ...(dto.bookingId !== undefined && { bookingId: dto.bookingId }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl }),
    };
    expenses[idx] = updated;
    return updated;
  }

  remove(id: number): { message: string } {
    if (id >= 100000) {
      throw new BadRequestException('Auto-generated booking expenses cannot be deleted directly. Cancel the booking instead.');
    }
    const idx = expenses.findIndex((e) => e.expenseId === id);
    if (idx === -1) throw new NotFoundException(`Expense with ID ${id} not found`);
    expenses.splice(idx, 1);
    return { message: `Expense with ID ${id} deleted successfully` };
  }
}
