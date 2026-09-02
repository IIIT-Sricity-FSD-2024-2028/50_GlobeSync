import { Injectable, NotFoundException } from '@nestjs/common';
import { 
  subscriptionPlans, 
  agencySubscriptions, 
  AgencySubscription 
} from '../data';
import { RevenueService } from '../revenue/revenue.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly revenueService: RevenueService) {}

  getAllPlans() {
    return subscriptionPlans;
  }

  getAgencySubscription(agencyId: number) {
    return agencySubscriptions.find(s => s.agency_id === agencyId && s.status !== 'CANCELLED');
  }

  subscribe(agencyId: number, planId: number, paymentRef: string) {
    const plan = subscriptionPlans.find(p => p.plan_id === planId);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const startDate = new Date();
    const renewalDate = new Date();
    if (plan.billing_cycle === 'YEARLY') {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    const newSub: AgencySubscription = {
      subscription_id: agencySubscriptions.length + 1,
      agency_id: agencyId,
      plan_id: plan.plan_id,
      status: 'ACTIVE',
      start_date: startDate.toISOString().split('T')[0],
      renewal_date: renewalDate.toISOString().split('T')[0],
      expiry_date: null,
      amount: plan.price,
      payment_reference: paymentRef,
    };

    agencySubscriptions.push(newSub);
    
    // Record revenue
    this.revenueService.recordSubscriptionRevenue(agencyId, plan.plan_id, plan.price);

    return newSub;
  }
}
