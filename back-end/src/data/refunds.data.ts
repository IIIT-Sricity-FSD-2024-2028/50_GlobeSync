/**
 * Refunds seed data
 * Source: front-end/JS/mockData.js → DB.refunds
 *
 * Relationships:
 *   - paymentId → payments.paymentId
 */
export interface Refund {
  refundId: number;
  paymentId: number;
  refundDate: string;
  refundTime: string;
  refundStatus: 'Processing' | 'Completed' | 'Rejected';
}

export const refunds: Refund[] = [
  { refundId: 1, paymentId: 2, refundDate: '2026-03-06', refundTime: '14:30:00', refundStatus: 'Processing' },
];
