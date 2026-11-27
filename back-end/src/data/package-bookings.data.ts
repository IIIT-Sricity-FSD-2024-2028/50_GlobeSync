export interface PackageBooking {
  packageBookingId: number;
  bookingDate: string;
  status: 'Confirmed' | 'Pending' | 'Planning';
  travelerId: number;
  packageId: number;
}

export const packageBookings: PackageBooking[] = [];
