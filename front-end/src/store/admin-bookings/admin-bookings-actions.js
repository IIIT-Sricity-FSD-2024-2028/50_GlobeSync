// Thunk: fetchAdminBookings
// Composite loader using Promise.allSettled following Prof. Mallikarjun Reddy Sir's pattern.
import {
  bookingsApi,
  tripsApi,
  travelersApi,
  agenciesApi,
  paymentsApi,
} from '../../services/api';
import { adminBookingsActions } from './admin-bookings-slice';

export const fetchAdminBookings = () => {
  return async (dispatch) => {
    dispatch(adminBookingsActions.setLoading(true));
    dispatch(adminBookingsActions.setError(null));
    try {
      const [bookingsRes, tripsRes, travelersRes, agenciesRes, paymentsRes] =
        await Promise.allSettled([
          bookingsApi.getAll(),
          tripsApi.getAll(),
          travelersApi.getAll(),
          agenciesApi.getAll(),
          paymentsApi.getAll(),
        ]);

      const bookings =
        bookingsRes.status === 'fulfilled'
          ? Array.isArray(bookingsRes.value?.data)
            ? bookingsRes.value.data
            : Array.isArray(bookingsRes.value)
            ? bookingsRes.value
            : []
          : [];

      const trips =
        tripsRes.status === 'fulfilled'
          ? Array.isArray(tripsRes.value?.data)
            ? tripsRes.value.data
            : Array.isArray(tripsRes.value)
            ? tripsRes.value
            : []
          : [];

      const travelers =
        travelersRes.status === 'fulfilled'
          ? Array.isArray(travelersRes.value?.data)
            ? travelersRes.value.data
            : Array.isArray(travelersRes.value)
            ? travelersRes.value
            : []
          : [];

      const agencies =
        agenciesRes.status === 'fulfilled'
          ? Array.isArray(agenciesRes.value?.data)
            ? agenciesRes.value.data
            : Array.isArray(agenciesRes.value)
            ? agenciesRes.value
            : []
          : [];

      const payments =
        paymentsRes.status === 'fulfilled'
          ? Array.isArray(paymentsRes.value?.data)
            ? paymentsRes.value.data
            : Array.isArray(paymentsRes.value)
            ? paymentsRes.value
            : []
          : [];

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
  };
};
