// Thunks: fetchAdminGuides, createAdminGuide, updateAdminGuide, verifyAdminGuide, requestAdminGuideDeactivation
// Isolated asynchronous operations following Prof. Mallikarjun Reddy Sir's pattern.
import { guidesApi, packagesApi, approvalsApi } from '../../services/api';
import { adminGuidesActions } from './admin-guides-slice';

export const fetchAdminGuides = () => {
  return async (dispatch) => {
    dispatch(adminGuidesActions.setLoading(true));
    dispatch(adminGuidesActions.setError(null));
    try {
      const [guidesRes, packagesRes] = await Promise.allSettled([
        guidesApi.getAll(),
        packagesApi.getAll(),
      ]);

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

      const result = { guides, packages };
      dispatch(adminGuidesActions.setGuidesData(result));
      return result;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load guides.';
      dispatch(adminGuidesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminGuidesActions.setLoading(false));
    }
  };
};

export const createAdminGuide = (payload) => {
  return async (dispatch) => {
    dispatch(adminGuidesActions.setLoading(true));
    dispatch(adminGuidesActions.setError(null));
    try {
      const res = await guidesApi.create(payload);
      const created = res?.data ?? res;
      dispatch(adminGuidesActions.addGuide(created));
      dispatch(adminGuidesActions.closeFormModal());
      return created;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to register guide.';
      dispatch(adminGuidesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminGuidesActions.setLoading(false));
    }
  };
};

export const updateAdminGuide = (guideId, payload) => {
  return async (dispatch) => {
    dispatch(adminGuidesActions.setLoading(true));
    dispatch(adminGuidesActions.setError(null));
    try {
      const res = await guidesApi.update(guideId, payload);
      const updated = res?.data ?? res;
      dispatch(adminGuidesActions.updateGuide(updated));
      dispatch(adminGuidesActions.closeFormModal());
      return updated;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update guide.';
      dispatch(adminGuidesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminGuidesActions.setLoading(false));
    }
  };
};

export const verifyAdminGuide = (guideId, payload) => {
  return async (dispatch) => {
    dispatch(adminGuidesActions.setLoading(true));
    dispatch(adminGuidesActions.setError(null));
    try {
      const res = await guidesApi.update(guideId, {
        verificationStatus: 'VERIFIED',
        ...payload,
      });
      const updated = res?.data ?? res;
      dispatch(adminGuidesActions.updateGuide(updated));
      dispatch(adminGuidesActions.closeVerifyModal());
      return updated;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to verify guide.';
      dispatch(adminGuidesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminGuidesActions.setLoading(false));
    }
  };
};

export const requestAdminGuideDeactivation = (guideId, reason) => {
  return async (dispatch, getState) => {
    dispatch(adminGuidesActions.setLoading(true));
    dispatch(adminGuidesActions.setError(null));
    try {
      const currentAdmin = getState().auth?.user;
      const requestedByLabel = currentAdmin?.email || currentAdmin?.name || 'Admin';
      const res = await approvalsApi.create({
        type: 'GUIDE_DEACTIVATION',
        entityType: 'guide',
        entityId: guideId,
        proposedValues: {
          status: 'DEACTIVATED',
          deactivationReason: reason.trim(),
        },
        reason: `Permanent guide deactivation requested by ${requestedByLabel}: ${reason.trim()}`,
      });
      dispatch(adminGuidesActions.closeDeactivateModal());
      return res?.data ?? res;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to submit guide deactivation request.';
      dispatch(adminGuidesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminGuidesActions.setLoading(false));
    }
  };
};
