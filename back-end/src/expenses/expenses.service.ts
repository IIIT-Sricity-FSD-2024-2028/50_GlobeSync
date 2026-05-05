import { Injectable, NotFoundException } from '@nestjs/common';
import { expenses, Expense } from '../data';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';

@Injectable()
export class ExpensesService {
  findByTrip(tripId: number): Expense[] {
    return expenses.filter((e) => e.tripId === tripId);
  }

  create(dto: CreateExpenseDto): Expense {
    const maxId = expenses.length > 0 ? Math.max(...expenses.map((e) => e.expenseId)) : 0;
    const item: Expense = {
      expenseId: maxId + 1,
      amount: dto.amount,
      type: dto.type as Expense['type'],
      tripId: dto.tripId,
      description: dto.description,
    };
    expenses.push(item);
    return item;
  }

  update(id: number, dto: UpdateExpenseDto): Expense {
    const idx = expenses.findIndex((e) => e.expenseId === id);
    if (idx === -1) throw new NotFoundException(`Expense with ID ${id} not found`);
    const updated: Expense = {
      ...expenses[idx],
      ...(dto.amount !== undefined && { amount: dto.amount }),
      ...(dto.type !== undefined && { type: dto.type as Expense['type'] }),
      ...(dto.tripId !== undefined && { tripId: dto.tripId }),
      ...(dto.description !== undefined && { description: dto.description }),
    };
    expenses[idx] = updated;
    return updated;
  }

  remove(id: number): { message: string } {
    const idx = expenses.findIndex((e) => e.expenseId === id);
    if (idx === -1) throw new NotFoundException(`Expense with ID ${id} not found`);
    expenses.splice(idx, 1);
    return { message: `Expense with ID ${id} deleted successfully` };
  }
}
