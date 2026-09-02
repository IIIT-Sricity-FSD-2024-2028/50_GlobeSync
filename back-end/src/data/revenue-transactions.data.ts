export interface RevenueTransaction {
  transaction_id: number;
  revenue_type: 'BOOKING_COMMISSION' | 'AGENCY_COMMISSION' | 'GUIDE_COMMISSION' | 'PROVIDER_COMMISSION' | 'PACKAGE_MARKUP' | 'SUBSCRIPTION' | 'FEATURED_LISTING';
  booking_reference: number | null;
  gross_amount: number;
  commission_rate: number | null;
  revenue_amount: number;
  payout_amount: number;
  currency: string;
  status: 'PENDING' | 'EARNED' | 'SETTLED' | 'CANCELLED' | 'REFUNDED';
  agency_id: number | null;
  guide_id: number | null;
  provider_id: number | null;
  created_at: string; // ISO string
  settled_at: string | null;
}

export const revenueTransactions: RevenueTransaction[] = [
  {
    transaction_id: 1,
    revenue_type: 'BOOKING_COMMISSION',
    booking_reference: 1,
    gross_amount: 20000,
    commission_rate: 10,
    revenue_amount: 2000,
    payout_amount: 18000,
    currency: 'INR',
    status: 'SETTLED',
    agency_id: null,
    guide_id: null,
    provider_id: null,
    created_at: '2023-08-01T10:00:00Z',
    settled_at: '2023-08-15T10:00:00Z',
  },
  {
    transaction_id: 2,
    revenue_type: 'AGENCY_COMMISSION',
    booking_reference: 2,
    gross_amount: 50000,
    commission_rate: 8,
    revenue_amount: 4000,
    payout_amount: 46000,
    currency: 'INR',
    status: 'EARNED',
    agency_id: 1,
    guide_id: null,
    provider_id: null,
    created_at: '2023-09-01T12:00:00Z',
    settled_at: null,
  }
];
