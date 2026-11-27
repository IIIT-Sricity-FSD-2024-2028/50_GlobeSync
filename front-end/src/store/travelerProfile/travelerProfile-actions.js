// Thunks: fetchTravelerProfileData, updateTravelerProfile, fetchTravelerPassengers,
// createTravelerPassenger, updateTravelerPassenger, deleteTravelerPassenger
import { passengersApi, travelersApi } from '../../services/api';
import { travelerProfileActions } from './travelerProfile-slice';

export const fetchTravelerProfileData = (travelerId) => {
  return async (dispatch) => {
    dispatch(travelerProfileActions.setLoading(true));
    dispatch(travelerProfileActions.setError(null));
    try {
      const data = await travelersApi.getById(travelerId);
      dispatch(travelerProfileActions.setProfile(data));
      return data;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerProfileActions.setError(err.message || 'Failed to load profile.'));
      }
      return null;
    } finally {
      dispatch(travelerProfileActions.setLoading(false));
    }
  };
};

export const fetchTravelerPassengers = (travelerId) => {
  return async (dispatch) => {
    dispatch(travelerProfileActions.setPassengersWarning(null));
    try {
      const data = await passengersApi.getByTraveler(travelerId);
      const list = Array.isArray(data) ? data : [];
      dispatch(travelerProfileActions.setPassengers(list));
      return list;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerProfileActions.setPassengersWarning(err.message || 'Could not reach co-traveler service.'));
      }
      throw err;
    }
  };
};

export const updateTravelerProfile = (travelerId, payload) => {
  return async (dispatch) => {
    dispatch(travelerProfileActions.setError(null));
    try {
      const updated = await travelersApi.update(travelerId, payload);
      dispatch(travelerProfileActions.setProfile(updated));
      return updated;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerProfileActions.setError(err.message || 'Failed to update profile.'));
      }
      throw err;
    }
  };
};

export const createTravelerPassenger = (payload) => {
  return async (dispatch) => {
    try {
      const created = await passengersApi.create(payload);
      dispatch(travelerProfileActions.addPassenger(created));
      return created;
    } catch (err) {
      throw err;
    }
  };
};

export const updateTravelerPassenger = (passId, payload) => {
  return async (dispatch) => {
    try {
      const updated = await passengersApi.update(passId, payload);
      dispatch(travelerProfileActions.updatePassenger(updated));
      return updated;
    } catch (err) {
      throw err;
    }
  };
};

export const deleteTravelerPassenger = (passId) => {
  return async (dispatch) => {
    try {
      await passengersApi.delete(passId);
      dispatch(travelerProfileActions.removePassenger(passId));
      return true;
    } catch (err) {
      throw err;
    }
  };
};
