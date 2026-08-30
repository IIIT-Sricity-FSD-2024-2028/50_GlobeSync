export interface CommissionEntry {
  commissionId: number;
  agencyId: number;
  tripId: number;
  grossAmount: number;
  commissionAmount: number;
  status: 'pending' | 'settled';
  createdAt: string;
}

// Seed commission entries tied to real agency IDs (1 and 2 seeded in agencies.data.ts).
// tripId values will align with any trips seeded for agencyId 1 and 2.
// These entries demonstrate both statuses for the demo ledger view.
export const commissionLedger: CommissionEntry[] = [
  { commissionId: 1, agencyId: 1, tripId: 13, grossAmount: 175000, commissionAmount: 17500, status: 'settled', createdAt: '2025-11-05' }
];
