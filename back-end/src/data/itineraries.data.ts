export interface Itinerary {
  itineraryId: number;
  tripId: number;
  city: string;
  dayNumber: number;
  activity: string;
  activityStatus: 'Completed' | 'Confirmed' | 'Pending';
  time: string;
  suggestedBy?: 'guide' | 'agency';
  suggestionStatus?: 'Approved' | 'Suggested' | 'Rejected';
  notes?: string;
  estimatedCost?: number;
}

export const itineraries: Itinerary[] = [];
