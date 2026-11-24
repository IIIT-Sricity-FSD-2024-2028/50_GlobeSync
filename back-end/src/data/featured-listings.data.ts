export interface FeaturedListing {
  listing_id: number;
  agency_id: number | null;
  package_id: number | null;
  promotion_type: 'HOMEPAGE' | 'SEARCH_RESULT';
  price: number;
  start_date: string;
  end_date: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED';
  payment_reference: string;
}

export const featuredListings: FeaturedListing[] = [];
