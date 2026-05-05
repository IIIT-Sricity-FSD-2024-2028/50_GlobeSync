/**
 * Itineraries seed data
 * Source: front-end/JS/mockData.js → DB.itineraries
 *
 * Relationships:
 *   - tripId → trips.tripId
 */
export interface Itinerary {
  itineraryId: number;
  tripId: number;
  city: string;
  dayNumber: number;
  activity: string;
  activityStatus: 'Completed' | 'Confirmed' | 'Pending';
  time: string;
}

export const itineraries: Itinerary[] = [
  // Paris trip (trip 1 — Arjun)
  { itineraryId: 1, tripId: 1, city: 'Paris', dayNumber: 1, activity: 'Arrival at Charles de Gaulle Airport', activityStatus: 'Completed', time: '09:00' },
  { itineraryId: 2, tripId: 1, city: 'Paris', dayNumber: 1, activity: 'Check-in at Hotel Lumiere', activityStatus: 'Completed', time: '11:30' },
  { itineraryId: 3, tripId: 1, city: 'Paris', dayNumber: 1, activity: 'Welcome Dinner at Le Petit Bistro', activityStatus: 'Completed', time: '19:00' },
  { itineraryId: 4, tripId: 1, city: 'Paris', dayNumber: 2, activity: 'Guided Tour of Louvre Museum', activityStatus: 'Confirmed', time: '10:00' },
  { itineraryId: 5, tripId: 1, city: 'Paris', dayNumber: 2, activity: 'Walk along Seine River', activityStatus: 'Pending', time: '15:00' },
  { itineraryId: 6, tripId: 1, city: 'Paris', dayNumber: 3, activity: 'Visit Eiffel Tower', activityStatus: 'Pending', time: '10:00' },

  // Goa trip (trip 5 — Nitin, COMPLETED)
  { itineraryId: 7, tripId: 5, city: 'Goa', dayNumber: 1, activity: 'Arrival at Dabolim Airport', activityStatus: 'Completed', time: '10:30' },
  { itineraryId: 8, tripId: 5, city: 'Goa', dayNumber: 1, activity: 'Check-in at Taj Fort Aguada', activityStatus: 'Completed', time: '12:00' },
  { itineraryId: 9, tripId: 5, city: 'Goa', dayNumber: 1, activity: 'Baga Beach sunset walk', activityStatus: 'Completed', time: '17:00' },
  { itineraryId: 10, tripId: 5, city: 'Goa', dayNumber: 2, activity: 'Fort Aguada morning visit', activityStatus: 'Completed', time: '08:00' },
  { itineraryId: 11, tripId: 5, city: 'Goa', dayNumber: 2, activity: "Lunch at Fisherman's Wharf", activityStatus: 'Completed', time: '12:30' },
  { itineraryId: 12, tripId: 5, city: 'Goa', dayNumber: 2, activity: 'Cruise on Mandovi River', activityStatus: 'Completed', time: '18:00' },
  { itineraryId: 13, tripId: 5, city: 'Goa', dayNumber: 3, activity: 'Dudhsagar Falls full-day trip', activityStatus: 'Completed', time: '07:00' },
  { itineraryId: 14, tripId: 5, city: 'Goa', dayNumber: 4, activity: 'South Goa beaches & departure', activityStatus: 'Completed', time: '09:00' },

  // Dubai trip (trip 6 — Nitin, CONFIRMED)
  { itineraryId: 15, tripId: 6, city: 'Dubai', dayNumber: 1, activity: 'Arrival at Dubai International DXB', activityStatus: 'Confirmed', time: '14:00' },
  { itineraryId: 16, tripId: 6, city: 'Dubai', dayNumber: 1, activity: 'Check-in at Atlantis The Palm', activityStatus: 'Confirmed', time: '16:00' },
  { itineraryId: 17, tripId: 6, city: 'Dubai', dayNumber: 1, activity: 'Dinner at Nobu Restaurant', activityStatus: 'Confirmed', time: '20:00' },
  { itineraryId: 18, tripId: 6, city: 'Dubai', dayNumber: 2, activity: 'Burj Khalifa 148th floor observation', activityStatus: 'Confirmed', time: '09:00' },
  { itineraryId: 19, tripId: 6, city: 'Dubai', dayNumber: 2, activity: 'Dubai Mall & Aquarium', activityStatus: 'Confirmed', time: '12:00' },
  { itineraryId: 20, tripId: 6, city: 'Dubai', dayNumber: 2, activity: 'Dubai Fountain evening show', activityStatus: 'Pending', time: '19:00' },
  { itineraryId: 21, tripId: 6, city: 'Dubai', dayNumber: 3, activity: 'Desert Safari with BBQ dinner', activityStatus: 'Pending', time: '15:00' },
  { itineraryId: 22, tripId: 6, city: 'Dubai', dayNumber: 4, activity: 'Abu Dhabi day trip — Grand Mosque', activityStatus: 'Pending', time: '08:00' },
  { itineraryId: 23, tripId: 6, city: 'Dubai', dayNumber: 5, activity: 'Palm Jumeirah & Departure', activityStatus: 'Pending', time: '10:00' },

  // Bali trip (trip 7 — Nitin, PENDING)
  { itineraryId: 24, tripId: 7, city: 'Bali', dayNumber: 1, activity: 'Arrival at Ngurah Rai Airport', activityStatus: 'Pending', time: '11:00' },
  { itineraryId: 25, tripId: 7, city: 'Bali', dayNumber: 1, activity: 'Transfer to Ubud Hanging Gardens', activityStatus: 'Pending', time: '14:00' },
  { itineraryId: 26, tripId: 7, city: 'Bali', dayNumber: 2, activity: 'Tegallalang Rice Terraces trek', activityStatus: 'Pending', time: '08:00' },
  { itineraryId: 27, tripId: 7, city: 'Bali', dayNumber: 2, activity: 'Ubud Monkey Forest', activityStatus: 'Pending', time: '14:00' },
  { itineraryId: 28, tripId: 7, city: 'Bali', dayNumber: 3, activity: 'Uluwatu Temple sunset', activityStatus: 'Pending', time: '16:00' },

  // New York trip (trip 4 — Rohan)
  { itineraryId: 29, tripId: 4, city: 'New York', dayNumber: 1, activity: 'Arrival at JFK Airport', activityStatus: 'Confirmed', time: '08:00' },
  { itineraryId: 30, tripId: 4, city: 'New York', dayNumber: 1, activity: 'Times Square walking tour', activityStatus: 'Confirmed', time: '14:00' },
  { itineraryId: 31, tripId: 4, city: 'New York', dayNumber: 2, activity: 'Statue of Liberty & Ellis Island', activityStatus: 'Confirmed', time: '09:00' },
  { itineraryId: 32, tripId: 4, city: 'New York', dayNumber: 2, activity: 'Brooklyn Bridge sunset walk', activityStatus: 'Pending', time: '17:00' },
];
