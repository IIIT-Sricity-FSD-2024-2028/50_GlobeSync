import { Injectable, NotFoundException } from '@nestjs/common';
import { featuredListings, FeaturedListing } from '../data';
import { RevenueService } from '../revenue/revenue.service';

@Injectable()
export class PromotionsService {
  constructor(private readonly revenueService: RevenueService) {}

  getAllPromotions() {
    return featuredListings;
  }

  createPromotion(agencyId: number, packageId: number, type: 'HOMEPAGE' | 'SEARCH_RESULT', price: number, paymentRef: string) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const newListing: FeaturedListing = {
      listing_id: featuredListings.length + 1,
      agency_id: agencyId,
      package_id: packageId,
      promotion_type: type,
      price: price,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'ACTIVE',
      payment_reference: paymentRef,
    };

    featuredListings.push(newListing);
    
    // Record revenue
    this.revenueService.recordPromotionRevenue(agencyId, packageId, price);

    return newListing;
  }
}
