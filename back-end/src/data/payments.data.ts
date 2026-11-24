export interface Payment {
  paymentId: number;
  amount: number;
  paymentDate: string;
  method?: 'Card' | 'UPI' | 'Cash' | string;
  status: 'Paid' | 'Pending';
  bookingId?: number;
  tripId?: number;
  travelerId?: number;
  agencyId?: number;
}

export const payments: Payment[] = [];
