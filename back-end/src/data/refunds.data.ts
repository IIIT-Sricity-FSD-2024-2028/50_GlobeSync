export interface Refund {
  refundId: number;
  paymentId: number;
  refundDate: string;
  refundTime: string;
  refundStatus: 'Processing' | 'Completed' | 'Rejected';
  agencyId?: number;
  amount?: number;
  reason?: string;
  notes?: string;
}

export const refunds: Refund[] = [];
