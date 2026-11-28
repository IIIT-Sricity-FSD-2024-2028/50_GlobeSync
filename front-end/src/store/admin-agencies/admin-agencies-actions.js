// Thunks: fetchAdminAgencies, fetchAdminAgencyById, createAdminAgency, updateAdminAgency, updateAdminAgencyStatus, requestAdminAgencyDeactivation
// Cache-aware manual thunks following Prof. Mallikarjun Reddy Sir's pattern.
import { agenciesApi, approvalsApi } from '../../services/api';
import { adminAgenciesActions } from './admin-agencies-slice';
import { adminDashboardActions } from '../admin-dashboard/admin-dashboard-slice';
import { runDeduplicated } from '../admin-ui/admin-cache-utils';

export const fetchAdminAgencies = ({ force = false } = {}) => {
  return async (dispatch, getState) => {
    const state = getState().adminAgencies;
    if (state?.loaded && !state.stale && !force) {
      return state.agencies;
    }

    return runDeduplicated('adminAgencies:fetch', async () => {
      const latest = getState().adminAgencies;
      if (latest?.loaded && !latest.stale && !force) {
        return latest.agencies;
      }

      dispatch(adminAgenciesActions.setLoading(true));
      dispatch(adminAgenciesActions.setError(null));
      try {
        const res = await agenciesApi.getAll();
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        dispatch(adminAgenciesActions.setAgencies(list));
        return list;
      } catch (err) {
        const msg = err?.response?.data?.message || err.message || 'Failed to load agencies.';
        dispatch(adminAgenciesActions.setError(msg));
        throw err;
      } finally {
        dispatch(adminAgenciesActions.setLoading(false));
      }
    });
  };
};

export const fetchAdminAgencyById = (agencyId, { force = false } = {}) => {
  return async (dispatch, getState) => {
    if (!agencyId) return null;
    const cached = getState().adminAgencies?.detailsByAgencyId?.[agencyId];
    if (cached?.loaded && !cached.stale && !force) {
      return cached.data;
    }

    return runDeduplicated(`adminAgencies:detail:${agencyId}`, async () => {
      const latest = getState().adminAgencies?.detailsByAgencyId?.[agencyId];
      if (latest?.loaded && !latest.stale && !force) {
        return latest.data;
      }

      dispatch(adminAgenciesActions.setAgencyDetailsLoading({ agencyId, loading: true }));
      try {
        const res = await agenciesApi.getById(agencyId);
        const data = res?.data ?? res;
        dispatch(adminAgenciesActions.setDetailedAgency(data));
        return data;
      } catch (err) {
        const msg = err?.response?.data?.message || err.message || 'Failed to fetch agency details.';
        dispatch(adminAgenciesActions.setAgencyDetailsError({ agencyId, error: msg }));
        dispatch(adminAgenciesActions.setError(msg));
        throw err;
      } finally {
        dispatch(adminAgenciesActions.setAgencyDetailsLoading({ agencyId, loading: false }));
      }
    });
  };
};

export const createAdminAgency = (payload) => {
  return async (dispatch) => {
    dispatch(adminAgenciesActions.setLoading(true));
    dispatch(adminAgenciesActions.setError(null));
    try {
      const res = await agenciesApi.create(payload);
      const created = res?.data ?? res;
      dispatch(adminAgenciesActions.addAgency(created));
      dispatch(adminAgenciesActions.closeFormModal());
      return created;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to create agency.';
      dispatch(adminAgenciesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminAgenciesActions.setLoading(false));
    }
  };
};

export const updateAdminAgency = (agencyId, payload) => {
  return async (dispatch) => {
    dispatch(adminAgenciesActions.setLoading(true));
    dispatch(adminAgenciesActions.setError(null));
    try {
      const res = await agenciesApi.update(agencyId, payload);
      const updated = res?.data ?? res;
      dispatch(adminAgenciesActions.updateAgency(updated));
      dispatch(adminAgenciesActions.closeFormModal());
      return updated;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update agency.';
      dispatch(adminAgenciesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminAgenciesActions.setLoading(false));
    }
  };
};

export const updateAdminAgencyStatus = (agencyId, payload) => {
  return async (dispatch) => {
    dispatch(adminAgenciesActions.setLoading(true));
    dispatch(adminAgenciesActions.setError(null));
    try {
      const res = await agenciesApi.updateStatus(agencyId, payload);
      const updated = res?.data ?? res;
      dispatch(adminAgenciesActions.updateAgency(updated));
      dispatch(adminAgenciesActions.closeStatusModal());
      return updated;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update agency status.';
      dispatch(adminAgenciesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminAgenciesActions.setLoading(false));
    }
  };
};

export const requestAdminAgencyDeactivation = (agencyId, reason) => {
  return async (dispatch, getState) => {
    dispatch(adminAgenciesActions.setLoading(true));
    dispatch(adminAgenciesActions.setError(null));
    try {
      const currentAdmin = getState().auth?.user;
      const requestedByLabel = currentAdmin?.email || currentAdmin?.name || 'Admin';
      const res = await approvalsApi.create({
        type: 'AGENCY_STATUS_COMMISSION',
        entityType: 'agency',
        entityId: agencyId,
        proposedValues: {
          status: 'rejected',
          statusReason: reason.trim(),
        },
        reason: `Permanent deactivation requested by ${requestedByLabel}: ${reason.trim()}`,
      });
      dispatch(adminAgenciesActions.closeDeactivateModal());
      return res?.data ?? res;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to submit deactivation request.';
      dispatch(adminAgenciesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminAgenciesActions.setLoading(false));
    }
  };
};
