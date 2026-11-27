export interface Booking {
  bookingId: number;
  bookingDate: string;
  status: string;
  tripId: number;
  travelerId?: number;
  agencyId?: number;
  service: string;
  type: 'Flight' | 'Hotel' | 'Transport' | 'Activity' | 'Package';
  amount: number;
  insuranceSelected?: boolean;
  insuranceRate?: number;
  insuranceAmount?: number;
  cancellationProtectionSelected?: boolean;
  cancellationFee?: number;
  cancellationReason?: string;
  cancelledAt?: string;
  packageId?: number;
  departureAtUtc?: string;
  departure_at_utc?: string;
  departureTimezone?: string;
  departure_timezone?: string;
  policySnapshot?: any;
  policy_snapshot?: any;
  total_minor?: number;
  holdExpiresAtUtc?: string;
  heldAt?: string;
  reservationRef?: string;
  guideId?: number;
  paidAt?: string;
  confirmedAt?: string;
  expiredAt?: string;
}

export const bookings: Booking[] = [];
