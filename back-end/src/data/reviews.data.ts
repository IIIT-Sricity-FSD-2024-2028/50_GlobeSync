export interface Review {
  reviewId: number;
  tripId: number;
  bookingId?: number;
  travelerId: number;
  guideId: number;
  tripRating: number;
  guideRating: number;
  comment: string;
  createdAt: string;
  guideResponse?: string;
  guideResponseAt?: string;
}

export const reviews: Review[] = [];
