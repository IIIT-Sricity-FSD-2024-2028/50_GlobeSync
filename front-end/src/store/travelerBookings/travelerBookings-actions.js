// Thunks: fetchTravelerBookings, createTravelerBooking, cancelTravelerBooking,
// confirmBookingTripStatus, submitTravelerReview
import { bookingsApi, reviewsApi, tripsApi } from '../../services/api';
import { travelerTripsActions } from '../travelerTrips/travelerTrips-slice';
import { travelerBookingsActions } from './travelerBookings-slice';

export const fetchTravelerBookings = (travelerId) => {
  return async (dispatch) => {
    dispatch(travelerBookingsActions.setLoading(true));
    dispatch(travelerBookingsActions.setError(null));
    try {
      const [bookingsRes, tripsRes, reviewsRes] = await Promise.allSettled([
        bookingsApi.getByTraveler(travelerId),
        tripsApi.getByTraveler(travelerId),
        reviewsApi.getAll(),
      ]);

      if (bookingsRes.status === 'fulfilled') {
        dispatch(travelerBookingsActions.setBookings(Array.isArray(bookingsRes.value) ? bookingsRes.value : []));
      } else if (!bookingsRes.reason?.isCancelled) {
        dispatch(travelerBookingsActions.setError(bookingsRes.reason?.message || 'Failed to load bookings.'));
      }

      if (tripsRes.status === 'fulfilled') {
        dispatch(travelerTripsActions.setTrips(Array.isArray(tripsRes.value) ? tripsRes.value : []));
      }

      if (reviewsRes.status === 'fulfilled' && Array.isArray(reviewsRes.value)) {
        const reviewedIds = reviewsRes.value
          .filter((r) => Number(r.travelerId) === Number(travelerId))
          .map((r) => r.bookingId)
          .filter(Boolean);
        dispatch(travelerBookingsActions.setReviewedBookingIds(reviewedIds));
      }

      return bookingsRes.status === 'fulfilled' ? bookingsRes.value : null;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerBookingsActions.setError(err.message || 'Failed to load bookings.'));
      }
      return null;
    } finally {
      dispatch(travelerBookingsActions.setLoading(false));
    }
  };
};

export const createTravelerBooking = (payload) => {
  return async (dispatch) => {
    dispatch(travelerBookingsActions.setError(null));
    try {
      const created = await bookingsApi.create(payload);
      dispatch(travelerBookingsActions.addBooking(created));
      return created;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerBookingsActions.setError(err.message || 'Failed to create booking.'));
      }
      throw err;
    }
  };
};

export const cancelTravelerBooking = (bookingId, reason) => {
  return async (dispatch) => {
    dispatch(travelerBookingsActions.setError(null));
    try {
      await bookingsApi.cancel(bookingId, reason);
      dispatch(travelerBookingsActions.updateBooking({ bookingId, status: 'Cancelled', cancellationReason: reason }));
      return true;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerBookingsActions.setError(err.message || 'Could not cancel booking.'));
      }
      throw err;
    }
  };
};

export const confirmBookingTripStatus = (tripId) => {
  return async (dispatch) => {
    try {
      await tripsApi.updateStatus(tripId, 'Confirmed');
      dispatch(travelerTripsActions.updateTrip({ tripId, status: 'Confirmed' }));
      return true;
    } catch (err) {
      throw err;
    }
  };
};

export const submitTravelerReview = (payload) => {
  return async (dispatch) => {
    try {
      const created = await reviewsApi.create(payload);
      dispatch(travelerBookingsActions.addReviewedBookingId(payload.bookingId));
      return created;
    } catch (err) {
      throw err;
    }
  };
};
