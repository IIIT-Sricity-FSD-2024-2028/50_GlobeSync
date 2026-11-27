export interface AgencySubscription {
  subscription_id: number;
  agency_id: number;
  plan_id: number;
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  start_date: string;
  renewal_date: string;
  expiry_date: string | null;
  amount: number;
  payment_reference: string;
}

export const agencySubscriptions: AgencySubscription[] = [];
