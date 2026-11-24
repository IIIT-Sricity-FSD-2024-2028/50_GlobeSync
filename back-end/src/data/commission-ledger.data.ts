export interface CommissionEntry {
  commissionId: number;
  agencyId: number;
  tripId: number;
  bookingId?: number;
  grossAmount: number;
  commissionAmount: number;
  rate?: number;
  status: 'pending' | 'settled' | 'earned' | 'cancelled' | 'void' | 'PENDING' | 'EARNED' | 'SETTLED';
  createdAt: string;
}

export const commissionLedger: CommissionEntry[] = [];
