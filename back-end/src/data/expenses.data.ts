export interface Expense {
  expenseId: number;
  amount: number;
  type: 'Hotel' | 'Flight' | 'Transport' | 'Food' | 'Activity' | 'Shopping' | 'Package' | 'Other';
  tripId: number;
  bookingId?: number;
  description: string;
  category?: string;
  receiptUrl?: string;
  createdAt?: string;
}

export const expenses: Expense[] = [];
