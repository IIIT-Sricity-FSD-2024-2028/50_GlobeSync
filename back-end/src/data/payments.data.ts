/**
 * Payments seed data
 * Source: front-end/JS/mockData.js → DB.payments
 *
 * Relationships:
 *   - bookingId → bookings.bookingId
 */
export interface Payment {
  paymentId: number;
  amount: number;
  paymentDate: string;
  method: 'Card' | 'UPI' | 'Cash';
  status: 'Paid' | 'Pending';
  bookingId: number;
}

export const payments: Payment[] = [
  { paymentId: 1, amount: 72000, paymentDate: '2026-03-05', method: 'Card', status: 'Paid', bookingId: 1 },
  { paymentId: 2, amount: 102000, paymentDate: '2026-03-05', method: 'Card', status: 'Paid', bookingId: 2 },
  { paymentId: 3, amount: 3800, paymentDate: '2026-03-03', method: 'UPI', status: 'Pending', bookingId: 3 },
  { paymentId: 4, amount: 102000, paymentDate: '2026-03-12', method: 'Card', status: 'Paid', bookingId: 4 },
  { paymentId: 5, amount: 136000, paymentDate: '2026-03-12', method: 'Card', status: 'Paid', bookingId: 5 },
  { paymentId: 6, amount: 15700, paymentDate: '2026-02-06', method: 'UPI', status: 'Paid', bookingId: 6 },
  { paymentId: 7, amount: 27200, paymentDate: '2026-02-06', method: 'Card', status: 'Paid', bookingId: 7 },
  { paymentId: 8, amount: 2400, paymentDate: '2026-02-14', method: 'Cash', status: 'Paid', bookingId: 8 },
  { paymentId: 9, amount: 3800, paymentDate: '2026-02-15', method: 'UPI', status: 'Paid', bookingId: 9 },
  { paymentId: 10, amount: 57800, paymentDate: '2026-03-14', method: 'Card', status: 'Paid', bookingId: 10 },
  { paymentId: 11, amount: 157200, paymentDate: '2026-03-14', method: 'Card', status: 'Paid', bookingId: 11 },
  { paymentId: 12, amount: 10200, paymentDate: '2026-03-15', method: 'UPI', status: 'Pending', bookingId: 12 },
  { paymentId: 13, amount: 8100, paymentDate: '2026-03-15', method: 'Card', status: 'Paid', bookingId: 13 },
  { paymentId: 14, amount: 29700, paymentDate: '2026-03-26', method: 'Card', status: 'Pending', bookingId: 14 },
  { paymentId: 15, amount: 61200, paymentDate: '2026-03-26', method: 'Card', status: 'Pending', bookingId: 15 },
  { paymentId: 16, amount: 80700, paymentDate: '2026-03-21', method: 'Card', status: 'Paid', bookingId: 16 },
  { paymentId: 17, amount: 93500, paymentDate: '2026-03-21', method: 'Card', status: 'Paid', bookingId: 17 },
];
