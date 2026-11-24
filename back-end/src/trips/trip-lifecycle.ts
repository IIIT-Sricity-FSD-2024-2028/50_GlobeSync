import { bookings, trips, commissionLedger, Trip } from '../data';

const CLOSED = ['CANCELLED', 'EXPIRED', 'REFUNDED'];
const PAID = ['CONFIRMED', 'PAID', 'COMPLETED'];

/**
 * Confirm a trip once every open booking on it has been paid.
 * Trip confirmation is a server decision driven by payments; clients can no
 * longer set a trip to Confirmed themselves.
 */
export function confirmTripIfFullyPaid(tripId: number | undefined): Trip | undefined {
  if (!tripId) return undefined;
  const trip = trips.find((t) => t.tripId === tripId);
  if (!trip || !['Planning', 'Pending'].includes(trip.status)) return trip;
  const open = bookings.filter((b) => b.tripId === tripId && !CLOSED.includes(String(b.status).toUpperCase()));
  if (open.length === 0) return trip;
  if (open.every((b) => PAID.includes(String(b.status).toUpperCase()))) {
    trip.status = 'Confirmed';
    commissionLedger.forEach((entry, i) => {
      if (entry.tripId === tripId && entry.status === 'pending') {
        commissionLedger[i] = { ...entry, status: 'earned' };
      }
    });
  }
  return trip;
}
