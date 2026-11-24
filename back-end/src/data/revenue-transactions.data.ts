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
  created_at: string;
  settled_at: string | null;
}

export const revenueTransactions: RevenueTransaction[] = [];
