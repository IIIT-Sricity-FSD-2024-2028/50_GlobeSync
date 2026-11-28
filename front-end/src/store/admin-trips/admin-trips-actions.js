// Thunks: fetchAdminTrips, fetchAdminTripDetails, requestAdminGuideReassignment
// Cache-aware manual thunks reusing canonical agencies, guides, packages & bookings caches.
import {
  tripsApi,
  travelersApi,
} from '../../services/api';
import { adminTripsActions } from './admin-trips-slice';
import { fetchAdminAgencies } from '../admin-agencies/admin-agencies-actions';
import { fetchAdminGuides } from '../admin-guides/admin-guides-actions';
import { fetchAdminPackages } from '../admin-packages/admin-packages-actions';
import { fetchAdminBookings } from '../admin-bookings/admin-bookings-actions';
import { runDeduplicated } from '../admin-ui/admin-cache-utils';

export const fetchAdminTrips = ({ force = false } = {}) => {
  return async (dispatch, getState) => {
    const state = getState().adminTrips;
    if (state?.loaded && !state.stale && !force) {
      return {
        trips: state.trips,
        travelers: state.relatedTravelers,
        agencies: getState().adminAgencies?.agencies || state.relatedAgencies,
        guides: getState().adminGuides?.guides || state.relatedGuides,
        packages: getState().adminPackages?.packages || state.relatedPackages,
      };
    }

    return runDeduplicated('adminTrips:fetch', async () => {
      const latest = getState().adminTrips;
      if (latest?.loaded && !latest.stale && !force) {
        return {
          trips: latest.trips,
          travelers: latest.relatedTravelers,
          agencies: getState().adminAgencies?.agencies || latest.relatedAgencies,
          guides: getState().adminGuides?.guides || latest.relatedGuides,
          packages: getState().adminPackages?.packages || latest.relatedPackages,
        };
      }

      dispatch(adminTripsActions.setLoading(true));
      dispatch(adminTripsActions.setError(null));
      try {
        const bookingsState = getState().adminBookings;
        const travelersPromise =
          !force && bookingsState?.loaded && Array.isArray(bookingsState.relatedTravelers)
            ? Promise.resolve(bookingsState.relatedTravelers)
            : travelersApi.getAll();

        const [tripsRes, travelersRes, agenciesResult, guidesResult, packagesResult] =
          await Promise.allSettled([
            tripsApi.getAll(),
            travelersPromise,
            dispatch(fetchAdminAgencies({ force })),
            dispatch(fetchAdminGuides({ force })),
            dispatch(fetchAdminPackages({ force })),
          ]);

        if (tripsRes.status === 'rejected') {
          throw tripsRes.reason || new Error('Failed to load trips.');
        }

        const trips = Array.isArray(tripsRes.value?.data)
          ? tripsRes.value.data
          : Array.isArray(tripsRes.value)
          ? tripsRes.value
          : [];

        const travelers =
          travelersRes.status === 'fulfilled'
            ? Array.isArray(travelersRes.value?.data)
              ? travelersRes.value.data
              : Array.isArray(travelersRes.value)
              ? travelersRes.value
              : []
            : latest?.relatedTravelers || [];

        const agencies =
          agenciesResult.status === 'fulfilled' && Array.isArray(agenciesResult.value)
            ? agenciesResult.value
            : getState().adminAgencies?.agencies || [];

        const guides =
          guidesResult.status === 'fulfilled'
            ? Array.isArray(guidesResult.value?.guides)
              ? guidesResult.value.guides
              : getState().adminGuides?.guides || []
            : getState().adminGuides?.guides || [];

        const packages =
          packagesResult.status === 'fulfilled' && Array.isArray(packagesResult.value)
            ? packagesResult.value
            : getState().adminPackages?.packages || [];

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
    });
  };
};

export const fetchAdminTripDetails = (tripId, { force = false } = {}) => {
  return async (dispatch, getState) => {
    if (!tripId) return null;

    const existingDetail = getState().adminTrips?.detailsByTripId?.[tripId];
    const bookingsLoaded = Boolean(getState().adminBookings?.loaded && !getState().adminBookings?.stale);

    if (existingDetail?.loaded && !existingDetail.stale && bookingsLoaded && !force) {
      const allBookings = getState().adminBookings?.bookings || [];
      const associatedBookings = allBookings.filter((b) => b.tripId === tripId);
      const payload = {
        tripId,
        associatedBookings,
        reassignmentHistory: existingDetail.reassignmentHistory || [],
      };
      dispatch(adminTripsActions.setTripDetails(payload));
      return payload;
    }

    return runDeduplicated(`adminTrips:detail:${tripId}`, async () => {
      dispatch(adminTripsActions.setDetailsLoading({ tripId, loading: true }));
      dispatch(adminTripsActions.setError(null));
      try {
        const bookingsPromise = dispatch(fetchAdminBookings({ force }));
        const shouldFetchReassignments = !existingDetail?.loaded || existingDetail.stale || force;
        const reassignPromise = shouldFetchReassignments
          ? tripsApi.getReassignments
            ? tripsApi.getReassignments(tripId)
            : Promise.resolve([])
          : Promise.resolve(existingDetail?.reassignmentHistory || []);

        const [bookingsResult, reassignRes] = await Promise.allSettled([
          bookingsPromise,
          reassignPromise,
        ]);

        const allBookings =
          bookingsResult.status === 'fulfilled'
            ? bookingsResult.value?.bookings || getState().adminBookings?.bookings || []
            : getState().adminBookings?.bookings || [];
        const associatedBookings = allBookings.filter((b) => b.tripId === tripId);

        const reassignmentHistory =
          reassignRes.status === 'fulfilled'
            ? Array.isArray(reassignRes.value?.data)
              ? reassignRes.value.data
              : Array.isArray(reassignRes.value)
              ? reassignRes.value
              : []
            : existingDetail?.reassignmentHistory || [];

        const payload = { tripId, associatedBookings, reassignmentHistory };
        dispatch(adminTripsActions.setTripDetails(payload));
        return payload;
      } catch (err) {
        const msg = err?.response?.data?.message || err.message || 'Failed to load trip details.';
        dispatch(adminTripsActions.setTripDetailsError({ tripId, error: msg }));
        dispatch(adminTripsActions.setError(msg));
        throw err;
      } finally {
        dispatch(adminTripsActions.setDetailsLoading({ tripId, loading: false }));
      }
    });
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
      dispatch(adminTripsActions.invalidateTripDetails(tripId));
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
