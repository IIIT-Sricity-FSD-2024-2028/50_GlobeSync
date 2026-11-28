// Thunks: fetchAdminProfile, updateAdminProfile
// Cache-aware manual thunks following Prof. Mallikarjun Reddy Sir's pattern.
import { adminsApi } from '../../services/api';
import { adminProfileActions } from './admin-profile-slice';
import { runDeduplicated } from '../admin-ui/admin-cache-utils';

export const fetchAdminProfile = (adminId, { force = false } = {}) => {
  return async (dispatch, getState) => {
    const resolvedId = adminId || getState().auth?.user?.adminId || getState().auth?.user?.id;
    if (!resolvedId) return null;

    const state = getState().adminProfile;
    if (
      state?.loaded &&
      !state.stale &&
      !force &&
      String(state.loadedAdminId) === String(resolvedId)
    ) {
      return state.profile;
    }

    return runDeduplicated(`adminProfile:${resolvedId}`, async () => {
      const latest = getState().adminProfile;
      if (
        latest?.loaded &&
        !latest.stale &&
        !force &&
        String(latest.loadedAdminId) === String(resolvedId)
      ) {
        return latest.profile;
      }

      dispatch(adminProfileActions.setLoading(true));
      dispatch(adminProfileActions.setError(null));
      try {
        const res = await adminsApi.getById(resolvedId);
        const profile = res?.data ?? res;
        dispatch(adminProfileActions.setProfile(profile));
        return profile;
      } catch (err) {
        const msg = err?.response?.data?.message || err.message || 'Failed to fetch admin profile.';
        dispatch(adminProfileActions.setError(msg));
        throw err;
      } finally {
        dispatch(adminProfileActions.setLoading(false));
      }
    });
  };
};

export const updateAdminProfile = (adminId, payload) => {
  return async (dispatch, getState) => {
    const resolvedId = adminId || getState().adminProfile?.profile?.adminId || getState().auth?.user?.adminId;
    dispatch(adminProfileActions.setLoading(true));
    dispatch(adminProfileActions.setError(null));
    try {
      const res = await adminsApi.update(resolvedId, payload);
      const updated = res?.data ?? res;
      dispatch(adminProfileActions.setProfile(updated));
      return updated;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update admin profile.';
      dispatch(adminProfileActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminProfileActions.setLoading(false));
    }
  };
};
