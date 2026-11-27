// Thunks: fetchAdminTrips, fetchAdminTripDetails, requestAdminGuideReassignment
// Isolated asynchronous operations following Prof. Mallikarjun Reddy Sir's pattern.
import {
  tripsApi,
  travelersApi,
  agenciesApi,
  guidesApi,
  packagesApi,
  bookingsApi,
} from '../../services/api';
import { adminTripsActions } from './admin-trips-slice';

export const fetchAdminTrips = () => {
  return async (dispatch) => {
    dispatch(adminTripsActions.setLoading(true));
    dispatch(adminTripsActions.setError(null));
    try {
      const [tripsRes, travelersRes, agenciesRes, guidesRes, packagesRes] =
        await Promise.allSettled([
          tripsApi.getAll(),
          travelersApi.getAll(),
          agenciesApi.getAll(),
          guidesApi.getAll(),
          packagesApi.getAll(),
        ]);

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

      const guides =
        guidesRes.status === 'fulfilled'
          ? Array.isArray(guidesRes.value?.data)
            ? guidesRes.value.data
            : Array.isArray(guidesRes.value)
            ? guidesRes.value
            : []
          : [];

      const packages =
        packagesRes.status === 'fulfilled'
          ? Array.isArray(packagesRes.value?.data)
            ? packagesRes.value.data
            : Array.isArray(packagesRes.value)
            ? packagesRes.value
            : []
          : [];

      const result = { trips, travelers, agencies, guides, packages };
      dispatch(adminTripsActions.setTripsData(result));
      return result;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load trips.';
      dispatch(adminTripsActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminTripsActions.setLoading(false));
    }
  };
};

export const fetchAdminTripDetails = (tripId) => {
  return async (dispatch, getState) => {
    if (!tripId) return null;
    dispatch(adminTripsActions.setDetailsLoading(true));
    dispatch(adminTripsActions.setError(null));
    try {
      const cachedBookings = getState().adminBookings?.bookings;
      const bookingsPromise =
        Array.isArray(cachedBookings) && cachedBookings.length > 0
          ? Promise.resolve(cachedBookings)
          : bookingsApi.getAll();
      const reassignPromise = tripsApi.getReassignments
        ? tripsApi.getReassignments(tripId)
        : Promise.resolve([]);

      const [bookingsRes, reassignRes] = await Promise.allSettled([
        bookingsPromise,
        reassignPromise,
      ]);

      const allBookings =
        bookingsRes.status === 'fulfilled'
          ? Array.isArray(bookingsRes.value?.data)
            ? bookingsRes.value.data
            : Array.isArray(bookingsRes.value)
            ? bookingsRes.value
            : []
          : [];
      const associatedBookings = allBookings.filter((b) => b.tripId === tripId);

      const reassignmentHistory =
        reassignRes.status === 'fulfilled'
          ? Array.isArray(reassignRes.value?.data)
            ? reassignRes.value.data
            : Array.isArray(reassignRes.value)
            ? reassignRes.value
            : []
          : [];

      const payload = { associatedBookings, reassignmentHistory };
      dispatch(adminTripsActions.setTripDetails(payload));
      return payload;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load trip details.';
      dispatch(adminTripsActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminTripsActions.setDetailsLoading(false));
    }
  };
};

export const requestAdminGuideReassignment = (tripId, payload) => {
  return async (dispatch) => {
    dispatch(adminTripsActions.setLoading(true));
    dispatch(adminTripsActions.setError(null));
    try {
      const res = await tripsApi.requestReassignment(tripId, payload);
      dispatch(
        adminTripsActions.updateTripGuide({
          tripId,
          guideId: payload?.replacementGuideId,
          guideStatus: 'Pending',
        })
      );
      dispatch(adminTripsActions.clearReassigningTrip());
      return res?.data ?? res;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to request guide reassignment.';
      dispatch(adminTripsActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminTripsActions.setLoading(false));
    }
  };
};
