// Thunk: fetchAdminBookings
// Cache-aware composite loader reusing canonical trips & agencies caches.
import {
  bookingsApi,
  travelersApi,
  paymentsApi,
} from '../../services/api';
import { adminBookingsActions } from './admin-bookings-slice';
import { fetchAdminTrips } from '../admin-trips/admin-trips-actions';
import { fetchAdminAgencies } from '../admin-agencies/admin-agencies-actions';
import { runDeduplicated } from '../admin-ui/admin-cache-utils';

export const fetchAdminBookings = ({ force = false } = {}) => {
  return async (dispatch, getState) => {
    const state = getState().adminBookings;
    if (state?.loaded && !state.stale && !force) {
      return {
        bookings: state.bookings,
        trips: getState().adminTrips?.trips || state.relatedTrips,
        travelers: state.relatedTravelers,
        agencies: getState().adminAgencies?.agencies || state.relatedAgencies,
        payments: state.relatedPayments,
      };
    }

    return runDeduplicated('adminBookings:fetch', async () => {
      const latest = getState().adminBookings;
      if (latest?.loaded && !latest.stale && !force) {
        return {
          bookings: latest.bookings,
          trips: getState().adminTrips?.trips || latest.relatedTrips,
          travelers: latest.relatedTravelers,
          agencies: getState().adminAgencies?.agencies || latest.relatedAgencies,
          payments: latest.relatedPayments,
        };
      }

      dispatch(adminBookingsActions.setLoading(true));
      dispatch(adminBookingsActions.setError(null));
      try {
        const [bookingsRes, tripsResult, travelersRes, agenciesResult, paymentsRes] =
          await Promise.allSettled([
            bookingsApi.getAll(),
            dispatch(fetchAdminTrips({ force })),
            travelersApi.getAll(),
            dispatch(fetchAdminAgencies({ force })),
            paymentsApi.getAll(),
          ]);

        if (bookingsRes.status === 'rejected') {
          throw bookingsRes.reason || new Error('Failed to load bookings.');
        }

        const bookings = Array.isArray(bookingsRes.value?.data)
          ? bookingsRes.value.data
          : Array.isArray(bookingsRes.value)
          ? bookingsRes.value
          : [];

        const trips =
          tripsResult.status === 'fulfilled'
            ? Array.isArray(tripsResult.value?.trips)
              ? tripsResult.value.trips
              : getState().adminTrips?.trips || []
            : getState().adminTrips?.trips || [];

        const travelers =
          travelersRes.status === 'fulfilled'
            ? Array.isArray(travelersRes.value?.data)
              ? travelersRes.value.data
              : Array.isArray(travelersRes.value)
              ? travelersRes.value
              : []
            : latest?.relatedTravelers || [];

        const agencies =
          agenciesResult.status === 'fulfilled'
            ? Array.isArray(agenciesResult.value)
              ? agenciesResult.value
              : getState().adminAgencies?.agencies || []
            : getState().adminAgencies?.agencies || [];

        const payments =
          paymentsRes.status === 'fulfilled'
            ? Array.isArray(paymentsRes.value?.data)
              ? paymentsRes.value.data
              : Array.isArray(paymentsRes.value)
              ? paymentsRes.value
              : []
            : latest?.relatedPayments || [];

        const result = { bookings, trips, travelers, agencies, payments };
        dispatch(adminBookingsActions.setBookingsData(result));
        return result;
      } catch (err) {
        const msg = err?.response?.data?.message || err.message || 'Failed to load bookings.';
        dispatch(adminBookingsActions.setError(msg));
        throw err;
      } finally {
        dispatch(adminBookingsActions.setLoading(false));
      }
    });
  };
};
