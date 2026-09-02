export interface SubscriptionPlan {
  plan_id: number;
  name: string;
  price: number;
  billing_cycle: 'MONTHLY' | 'YEARLY';
  features: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    plan_id: 1,
    name: 'BASIC',
    price: 999,
    billing_cycle: 'MONTHLY',
    features: 'Up to 50 bookings/month, Standard Support',
    status: 'ACTIVE',
  },
  {
    plan_id: 2,
    name: 'PROFESSIONAL',
    price: 2499,
    billing_cycle: 'MONTHLY',
    features: 'Up to 200 bookings/month, Priority Support',
    status: 'ACTIVE',
  },
  {
    plan_id: 3,
    name: 'ENTERPRISE',
    price: 4999,
    billing_cycle: 'MONTHLY',
    features: 'Unlimited bookings, 24/7 Dedicated Support',
    status: 'ACTIVE',
  },
];
