export interface FeaturedListing {
  listing_id: number;
  agency_id: number | null;
  package_id: number | null;
  promotion_type: 'HOMEPAGE' | 'SEARCH_RESULT';
  price: number;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED';
  payment_reference: string;
}

export const featuredListings: FeaturedListing[] = [
  {
    listing_id: 1,
    agency_id: 1,
    package_id: 1,
    promotion_type: 'HOMEPAGE',
    price: 5000,
    start_date: '2023-09-01',
    end_date: '2023-10-01',
    status: 'EXPIRED',
    payment_reference: 'PAY-PROM-1',
  },
];
