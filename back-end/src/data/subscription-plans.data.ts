export interface SubscriptionPlan {
  plan_id: number;
  name: string;
  price: number;
  billing_cycle: 'MONTHLY' | 'YEARLY';
  features: string;
  status: 'ACTIVE' | 'INACTIVE';
  bookingAllowance: number;
  maxFeaturedSlots: number;
  maxPackages: number;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    plan_id: 1,
    name: 'BASIC',
    price: 999,
    billing_cycle: 'MONTHLY',
    features: 'Up to 50 bookings/month, 10 packages, 2 featured slots, Standard Support',
    status: 'ACTIVE',
    bookingAllowance: 50,
    maxFeaturedSlots: 2,
    maxPackages: 10,
  },
  {
    plan_id: 2,
    name: 'PROFESSIONAL',
    price: 2499,
    billing_cycle: 'MONTHLY',
    features: 'Up to 200 bookings/month, 30 packages, 5 featured slots, Priority Support',
    status: 'ACTIVE',
    bookingAllowance: 200,
    maxFeaturedSlots: 5,
    maxPackages: 30,
  },
  {
    plan_id: 3,
    name: 'ENTERPRISE',
    price: 4999,
    billing_cycle: 'MONTHLY',
    features: 'Unlimited bookings, unlimited packages, 20 featured slots, 24/7 Dedicated Support',
    status: 'ACTIVE',
    bookingAllowance: 999999,
    maxFeaturedSlots: 20,
    maxPackages: 999999,
  },
];
