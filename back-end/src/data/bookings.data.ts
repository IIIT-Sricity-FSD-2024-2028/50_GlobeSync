/**
 * Bookings seed data
 * Source: front-end/JS/mockData.js → DB.bookings
 *
 * Relationships:
 *   - tripId     → trips.tripId
 *   - travelerId → travelers.travelerId
 */
export interface Booking {
  bookingId: number;
  bookingDate: string;
  status: 'Confirmed' | 'Pending';
  tripId: number;
  travelerId: number;
  service: string;
  type: 'Flight' | 'Hotel' | 'Transport' | 'Activity';
  amount: number;
}

export const bookings: Booking[] = [
  { bookingId: 1, bookingDate: '2026-03-01', status: 'Confirmed', tripId: 1, travelerId: 1, service: 'Air France XY123', type: 'Flight', amount: 48000 },
  { bookingId: 2, bookingDate: '2026-03-01', status: 'Confirmed', tripId: 1, travelerId: 1, service: 'Hotel Lumiere', type: 'Hotel', amount: 56000 },
  { bookingId: 3, bookingDate: '2026-03-03', status: 'Pending', tripId: 1, travelerId: 1, service: 'Paris Metro Pass', type: 'Transport', amount: 2500 },
  { bookingId: 4, bookingDate: '2026-03-10', status: 'Confirmed', tripId: 2, travelerId: 1, service: 'ANA Flight NH101', type: 'Flight', amount: 65000 },
  { bookingId: 5, bookingDate: '2026-03-10', status: 'Confirmed', tripId: 2, travelerId: 1, service: 'Hotel Shinjuku Grand', type: 'Hotel', amount: 78000 },
  { bookingId: 6, bookingDate: '2026-02-05', status: 'Confirmed', tripId: 5, travelerId: 4, service: 'IndiGo 6E-231 DEL→GOI', type: 'Flight', amount: 12500 },
  { bookingId: 7, bookingDate: '2026-02-05', status: 'Confirmed', tripId: 5, travelerId: 4, service: 'Taj Fort Aguada Resort', type: 'Hotel', amount: 24000 },
  { bookingId: 8, bookingDate: '2026-02-06', status: 'Confirmed', tripId: 5, travelerId: 4, service: 'Scooter Rental (4 days)', type: 'Transport', amount: 1800 },
  { bookingId: 9, bookingDate: '2026-02-07', status: 'Confirmed', tripId: 5, travelerId: 4, service: 'Dudhsagar Falls Tour', type: 'Activity', amount: 3500 },
  { bookingId: 10, bookingDate: '2026-03-12', status: 'Confirmed', tripId: 6, travelerId: 4, service: 'Emirates EK-508 HYD→DXB', type: 'Flight', amount: 52000 },
  { bookingId: 11, bookingDate: '2026-03-12', status: 'Confirmed', tripId: 6, travelerId: 4, service: 'Atlantis The Palm', type: 'Hotel', amount: 95000 },
  { bookingId: 12, bookingDate: '2026-03-13', status: 'Pending', tripId: 6, travelerId: 4, service: 'Desert Safari Premium', type: 'Activity', amount: 6500 },
  { bookingId: 13, bookingDate: '2026-03-14', status: 'Confirmed', tripId: 6, travelerId: 4, service: 'Burj Khalifa 148th Floor', type: 'Activity', amount: 4800 },
  { bookingId: 14, bookingDate: '2026-03-25', status: 'Pending', tripId: 7, travelerId: 4, service: 'AirAsia QZ-265 DEL→DPS', type: 'Flight', amount: 24500 },
  { bookingId: 15, bookingDate: '2026-03-25', status: 'Pending', tripId: 7, travelerId: 4, service: 'Ubud Hanging Gardens', type: 'Hotel', amount: 42000 },
  { bookingId: 16, bookingDate: '2026-03-20', status: 'Confirmed', tripId: 4, travelerId: 3, service: 'Delta DL-185 BOM→JFK', type: 'Flight', amount: 78000 },
  { bookingId: 17, bookingDate: '2026-03-20', status: 'Confirmed', tripId: 4, travelerId: 3, service: 'The Roosevelt Hotel', type: 'Hotel', amount: 85000 },
];
