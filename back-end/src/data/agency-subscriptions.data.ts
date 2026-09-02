export interface AgencySubscription {
  subscription_id: number;
  agency_id: number;
  plan_id: number;
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  start_date: string; // ISO date string
  renewal_date: string; // ISO date string
  expiry_date: string | null;
  amount: number;
  payment_reference: string;
}

export const agencySubscriptions: AgencySubscription[] = [
  {
    subscription_id: 1,
    agency_id: 1,
    plan_id: 2, // PROFESSIONAL
    status: 'ACTIVE',
    start_date: '2023-01-01',
    renewal_date: '2026-10-01',
    expiry_date: null,
    amount: 2499,
    payment_reference: 'PAY-SUB-123',
  },
];
