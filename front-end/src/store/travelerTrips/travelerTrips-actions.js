// Thunks: fetchTravelerTrips, fetchTripGuides, fetchAvailableGuides, fetchResumeTrip,
// createTravelerTrip, updateTravelerTrip, cancelTravelerTrip, respondGuideReassignment,
// fetchTripItineraries, createItineraryItem, updateItineraryItem, deleteItineraryItem
import { guidesApi, itinerariesApi, tripsApi } from '../../services/api';
import { travelerTripsActions } from './travelerTrips-slice';

function filterPendingConsents(reassignments) {
  if (!Array.isArray(reassignments)) return [];
  return reassignments.filter(
    (r) => r.status === 'PENDING_CONSENT' && (r.travelerConsent === 'PENDING' || !r.travelerConsent)
  );
}

export const fetchTravelerTrips = (travelerId) => {
  return async (dispatch) => {
    dispatch(travelerTripsActions.setLoading(true));
    dispatch(travelerTripsActions.setError(null));
    try {
      const [tripsData, reassignmentsData] = await Promise.all([
        tripsApi.getByTraveler(travelerId),
        tripsApi.getMyReassignments().catch(() => []),
      ]);
      const list = Array.isArray(tripsData) ? tripsData : [];
      dispatch(travelerTripsActions.setTrips(list));
      dispatch(travelerTripsActions.setPendingReassignments(filterPendingConsents(reassignmentsData)));
      return list;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerTripsActions.setError(err.message || 'Failed to load trips.'));
      }
      return null;
    } finally {
      dispatch(travelerTripsActions.setLoading(false));
    }
  };
};

export const fetchTripGuides = () => {
  return async (dispatch) => {
    dispatch(travelerTripsActions.setGuidesWarning(null));
    try {
      const data = await guidesApi.getAll();
      const list = Array.isArray(data) ? data : [];
      dispatch(travelerTripsActions.setGuides(list));
      return list;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerTripsActions.setGuidesWarning(err.message || 'Failed to load guides directory.'));
      }
      return [];
    }
  };
};

export const fetchAvailableGuides = (startDate, endDate, excludeTripId) => {
  return async (dispatch) => {
    try {
      const data = await guidesApi.getAvailable(startDate, endDate, { excludeTripId });
      if (Array.isArray(data)) {
        dispatch(travelerTripsActions.setGuides(data));
      }
      return data;
    } catch {
      return null;
    }
  };
};

export const fetchResumeTrip = (tripId) => {
  return async (dispatch) => {
    dispatch(travelerTripsActions.setError(null));
    try {
      const data = await tripsApi.getById(tripId);
      dispatch(travelerTripsActions.setResumeTrip(data));
      return data;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerTripsActions.setError(err.message || 'Could not load the saved trip.'));
      }
      return null;
    }
  };
};

export const createTravelerTrip = (payload) => {
  return async (dispatch) => {
    dispatch(travelerTripsActions.setError(null));
    try {
      const created = await tripsApi.create(payload);
      dispatch(travelerTripsActions.addTrip(created));
      return created;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerTripsActions.setError(err.message || 'Failed to create trip.'));
      }
      throw err;
    }
  };
};

export const updateTravelerTrip = (tripId, payload) => {
  return async (dispatch) => {
    dispatch(travelerTripsActions.setError(null));
    try {
      const updated = await tripsApi.update(tripId, payload);
      dispatch(travelerTripsActions.updateTrip(updated));
      return updated;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerTripsActions.setError(err.message || 'Failed to update trip.'));
      }
      throw err;
    }
  };
};

export const cancelTravelerTrip = (tripId, payload) => {
  return async (dispatch) => {
    dispatch(travelerTripsActions.setError(null));
    try {
      const body = typeof payload === 'string' ? { status: 'Cancelled', cancellationReason: payload } : { status: 'Cancelled', ...payload };
      await tripsApi.updateStatus(tripId, body);
      dispatch(travelerTripsActions.updateTrip({ tripId, ...body }));
      return true;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerTripsActions.setError(err.message || 'Failed to cancel trip.'));
      }
      throw err;
    }
  };
};

export const respondGuideReassignment = (requestId, consent, reason) => {
  return async (dispatch) => {
    dispatch(travelerTripsActions.setError(null));
    try {
      await tripsApi.respondTravelerConsent(requestId, {
        decision: consent ? 'ACCEPT' : 'REJECT',
        reason,
      });
      dispatch(travelerTripsActions.removePendingReassignment(requestId));
      return true;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerTripsActions.setError(err.message || 'Failed to submit consent.'));
      }
      throw err;
    }
  };
};

export const fetchTripItineraries = (tripId) => {
  return async (dispatch) => {
    dispatch(travelerTripsActions.setItinerariesLoading(true));
    dispatch(travelerTripsActions.setItinerariesError(null));
    try {
      const data = await itinerariesApi.getByTrip(tripId);
      const list = Array.isArray(data) ? data : [];
      dispatch(travelerTripsActions.setItineraries(list));
      return list;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerTripsActions.setItinerariesError(err.message || 'Failed to load itineraries.'));
      }
      return null;
    } finally {
      dispatch(travelerTripsActions.setItinerariesLoading(false));
    }
  };
};

export const createItineraryItem = (payload) => {
  return async (dispatch) => {
    dispatch(travelerTripsActions.setItinerariesError(null));
    try {
      const created = await itinerariesApi.create(payload);
      dispatch(travelerTripsActions.addItinerary(created));
      return created;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerTripsActions.setItinerariesError(err.message || 'Failed to create itinerary activity.'));
      }
      throw err;
    }
  };
};

export const updateItineraryItem = (id, payload) => {
  return async (dispatch) => {
    dispatch(travelerTripsActions.setItinerariesError(null));
    try {
      const updated = await itinerariesApi.update(id, payload);
      dispatch(travelerTripsActions.updateItinerary(updated));
      return updated;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerTripsActions.setItinerariesError(err.message || 'Failed to update itinerary activity.'));
      }
      throw err;
    }
  };
};

export const deleteItineraryItem = (id) => {
  return async (dispatch) => {
    dispatch(travelerTripsActions.setItinerariesError(null));
    try {
      await itinerariesApi.delete(id);
      dispatch(travelerTripsActions.removeItinerary(id));
      return true;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerTripsActions.setItinerariesError(err.message || 'Failed to delete itinerary activity.'));
      }
      throw err;
    }
  };
};
