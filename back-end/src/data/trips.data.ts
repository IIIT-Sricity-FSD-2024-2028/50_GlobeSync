/**
 * Trips seed data
 * Source: front-end/JS/mockData.js → DB.trips
 *
 * Relationships:
 *   - travelerId → travelers.travelerId
 *   - guideId   → guides.guideId (nullable)
 *   - packageId → packages.packageId
 */
export interface Trip {
  tripId: number;
  origin?: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travelerId?: number;
  agencyId?: number;
  guideId: number | null;
  packageId?: number;
  status: 'Planning' | 'Pending' | 'Confirmed' | 'Active' | 'Completed' | 'Cancelled';
  guideStatus?: 'Pending' | 'Accepted' | 'Declined';
}

export const trips: Trip[] = [
  { tripId: 1, origin: 'New Delhi, India', destination: 'Paris, France', startDate: '2026-03-12', endDate: '2026-03-18', budget: 185000, travelerId: 1, guideId: 1, packageId: 1, status: 'Confirmed', guideStatus: 'Accepted' },
  { tripId: 2, origin: 'Mumbai, India', destination: 'Tokyo, Japan', startDate: '2026-03-25', endDate: '2026-04-02', budget: 245000, travelerId: 1, guideId: 2, packageId: 2, status: 'Pending', guideStatus: 'Pending' },
  { tripId: 3, origin: 'Bengaluru, India', destination: 'Swiss Alps', startDate: '2026-05-10', endDate: '2026-05-17', budget: 215000, travelerId: 2, guideId: 1, packageId: 3, status: 'Planning', guideStatus: 'Pending' },
  { tripId: 4, origin: 'New Delhi, India', destination: 'New York, USA', startDate: '2026-04-01', endDate: '2026-04-07', budget: 165000, travelerId: 3, guideId: 2, packageId: 5, status: 'Confirmed', guideStatus: 'Accepted' },
  { tripId: 5, origin: 'Mumbai, India', destination: 'Goa, India', startDate: '2026-02-14', endDate: '2026-02-18', budget: 15000, travelerId: 4, guideId: 1, packageId: 7, status: 'Completed', guideStatus: 'Accepted' },
  { tripId: 6, origin: 'Bengaluru, India', destination: 'Dubai, UAE', startDate: '2026-03-20', endDate: '2026-03-25', budget: 285000, travelerId: 4, guideId: 2, packageId: 6, status: 'Confirmed', guideStatus: 'Accepted' },
  { tripId: 7, origin: 'Chennai, India', destination: 'Bali, Indonesia', startDate: '2026-04-10', endDate: '2026-04-16', budget: 95000, travelerId: 4, guideId: 1, packageId: 4, status: 'Pending', guideStatus: 'Pending' },
  { tripId: 8, origin: 'Bengaluru, India', destination: 'Kerala, India', startDate: '2026-05-01', endDate: '2026-05-06', budget: 18500, travelerId: 4, guideId: null, packageId: 8, status: 'Planning' },
  { tripId: 9, origin: 'Hyderabad, India', destination: 'Bali, Indonesia', startDate: '2026-04-20', endDate: '2026-04-26', budget: 95000, travelerId: 2, guideId: 2, packageId: 4, status: 'Confirmed', guideStatus: 'Accepted' },
  { tripId: 10, origin: 'New Delhi, India', destination: 'Rajasthan, India', startDate: '2026-06-01', endDate: '2026-06-10', budget: 25000, travelerId: 3, guideId: 1, packageId: 10, status: 'Planning', guideStatus: 'Pending' },
  { tripId: 11, origin: 'Kolkata, India', destination: 'Singapore', startDate: '2026-07-05', endDate: '2026-07-13', budget: 195000, travelerId: 1, guideId: 2, packageId: 9, status: 'Planning', guideStatus: 'Pending' },
  { tripId: 12, origin: 'Chennai, India', destination: 'Kerala, India', startDate: '2026-06-15', endDate: '2026-06-20', budget: 18500, travelerId: 2, guideId: 1, packageId: 8, status: 'Pending', guideStatus: 'Pending' },
  { tripId: 13, origin: 'Mumbai, India', destination: 'Rome, Italy', startDate: '2025-12-05', endDate: '2025-12-12', budget: 175000, agencyId: 1, guideId: 1, packageId: 1, status: 'Completed', guideStatus: 'Accepted' },
  { tripId: 14, origin: 'New Delhi, India', destination: 'Sydney, Australia', startDate: '2026-01-10', endDate: '2026-01-20', budget: 220000, travelerId: 2, guideId: 1, packageId: 2, status: 'Completed', guideStatus: 'Accepted' },
  { tripId: 15, origin: 'Bengaluru, India', destination: 'Cape Town, South Africa', startDate: '2025-11-15', endDate: '2025-11-22', budget: 160000, travelerId: 3, guideId: 1, packageId: 3, status: 'Completed', guideStatus: 'Accepted' },
  { tripId: 16, origin: 'Mumbai, India', destination: 'London, UK', startDate: '2025-08-10', endDate: '2025-08-17', budget: 195000, travelerId: 4, guideId: 1, packageId: 1, status: 'Completed', guideStatus: 'Accepted' },
  { tripId: 17, origin: 'New Delhi, India', destination: 'Kyoto, Japan', startDate: '2025-04-05', endDate: '2025-04-12', budget: 210000, travelerId: 1, guideId: 2, packageId: 2, status: 'Completed', guideStatus: 'Accepted' },
  { tripId: 18, origin: 'Bengaluru, India', destination: 'Machu Picchu, Peru', startDate: '2025-09-20', endDate: '2025-09-28', budget: 150000, travelerId: 2, guideId: 2, packageId: 4, status: 'Completed', guideStatus: 'Accepted' },
  { tripId: 19, origin: 'Mumbai, India', destination: 'Cairo, Egypt', startDate: '2025-10-15', endDate: '2025-10-22', budget: 140000, travelerId: 3, guideId: 1, packageId: 6, status: 'Completed', guideStatus: 'Accepted' },
  { tripId: 20, origin: 'New Delhi, India', destination: 'Reykjavik, Iceland', startDate: '2025-01-10', endDate: '2025-01-18', budget: 280000, travelerId: 4, guideId: 2, packageId: 5, status: 'Completed', guideStatus: 'Accepted' },
];
