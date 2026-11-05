export interface CommissionEntry {
  commissionId: number;
  agencyId: number;
  tripId: number;
  bookingId?: number;
  grossAmount: number;
  commissionAmount: number;
  rate?: number;
  status: 'pending' | 'settled' | 'earned' | 'cancelled' | 'void';
  createdAt: string;
}

// Seed commission entries tied to real agency IDs (1 and 2 seeded in agencies.data.ts).
export const commissionLedger: CommissionEntry[] = [
  { commissionId: 1, agencyId: 1, tripId: 13, grossAmount: 175000, commissionAmount: 2625, rate: 1.5, status: 'settled', createdAt: '2025-12-05' },
  { commissionId: 2, agencyId: 1, tripId: 21, grossAmount: 260000, commissionAmount: 3900, rate: 1.5, status: 'earned', createdAt: '2026-07-01' },
  { commissionId: 3, agencyId: 1, tripId: 22, grossAmount: 195000, commissionAmount: 2925, rate: 1.5, status: 'pending', createdAt: '2026-09-15' },
];
