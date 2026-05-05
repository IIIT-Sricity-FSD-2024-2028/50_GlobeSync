/**
 * Reviews seed data
 * Source: front-end/JS/mockData.js → DB.reviews
 *
 * Relationships:
 *   - tripId     → trips.tripId
 *   - travelerId → travelers.travelerId
 *   - guideId    → guides.guideId
 */
export interface Review {
  reviewId: number;
  tripId: number;
  travelerId: number;
  guideId: number;
  tripRating: number;
  guideRating: number;
  comment: string;
  createdAt: string;
}

export const reviews: Review[] = [
  { reviewId: 1, tripId: 1, travelerId: 1, guideId: 1, tripRating: 5, guideRating: 5, comment: 'Amazing trip! The guide was excellent.', createdAt: '2026-03-20' },
  { reviewId: 2, tripId: 5, travelerId: 4, guideId: 1, tripRating: 5, guideRating: 4, comment: 'Goa was fantastic! Loved the itinerary.', createdAt: '2026-02-20' },
  { reviewId: 3, tripId: 13, travelerId: 1, guideId: 1, tripRating: 5, guideRating: 5, comment: 'Rome was unforgettable! Devansh knew all the best local pasta spots.', createdAt: '2025-12-15' },
  { reviewId: 4, tripId: 14, travelerId: 2, guideId: 1, tripRating: 4, guideRating: 5, comment: 'The Opera House tour was stunning. Great accommodation.', createdAt: '2026-01-22' },
  { reviewId: 5, tripId: 15, travelerId: 3, guideId: 1, tripRating: 5, guideRating: 5, comment: 'Cape Town was a dream come true. Safaris were well-coordinated.', createdAt: '2025-11-25' },
  { reviewId: 6, tripId: 16, travelerId: 4, guideId: 1, tripRating: 5, guideRating: 4, comment: 'Loved London, but weather was rainy. Guide was perfect though!', createdAt: '2025-08-19' },
  { reviewId: 7, tripId: 17, travelerId: 1, guideId: 2, tripRating: 5, guideRating: 5, comment: 'Kyoto the most beautiful place on earth! Mateo was a great host.', createdAt: '2025-04-15' },
  { reviewId: 8, tripId: 18, travelerId: 2, guideId: 2, tripRating: 4, guideRating: 4, comment: 'Amazing trek up Machu Picchu, definitely worth it.', createdAt: '2025-10-02' },
  { reviewId: 9, tripId: 19, travelerId: 3, guideId: 1, tripRating: 5, guideRating: 5, comment: 'Exploring the Pyramids in Cairo with Devansh was magical. Best guide!', createdAt: '2025-10-25' },
  { reviewId: 10, tripId: 20, travelerId: 4, guideId: 2, tripRating: 5, guideRating: 5, comment: 'Saw the Northern Lights! Breathtaking experience.', createdAt: '2025-01-20' },
];
