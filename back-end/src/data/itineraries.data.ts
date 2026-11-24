export interface Itinerary {
  itineraryId: number;
  tripId: number;
  city: string;
  dayNumber: number;
  activity: string;
  activityStatus: 'Completed' | 'Confirmed' | 'Pending';
  time: string;
}

export const itineraries: Itinerary[] = [];
