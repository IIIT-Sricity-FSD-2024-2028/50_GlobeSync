/**
 * Package bookings seed data
 * Source: front-end/JS/mockData.js → DB.packageBookings
 *
 * Relationships:
 *   - travelerId → travelers.travelerId
 *   - packageId  → packages.packageId
 */
export interface PackageBooking {
  packageBookingId: number;
  bookingDate: string;
  status: 'Confirmed' | 'Pending' | 'Planning';
  travelerId: number;
  packageId: number;
}

export const packageBookings: PackageBooking[] = [
  { packageBookingId: 1, bookingDate: '2026-03-01', status: 'Confirmed', travelerId: 1, packageId: 2 },
  { packageBookingId: 2, bookingDate: '2026-03-05', status: 'Pending', travelerId: 2, packageId: 3 },
  { packageBookingId: 3, bookingDate: '2026-02-01', status: 'Confirmed', travelerId: 4, packageId: 7 },
  { packageBookingId: 4, bookingDate: '2026-03-10', status: 'Confirmed', travelerId: 4, packageId: 6 },
  { packageBookingId: 5, bookingDate: '2026-03-22', status: 'Pending', travelerId: 4, packageId: 4 },
  { packageBookingId: 6, bookingDate: '2026-03-28', status: 'Planning', travelerId: 4, packageId: 8 },
];
