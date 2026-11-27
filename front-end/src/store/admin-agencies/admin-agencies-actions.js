// Thunks: fetchAdminAgencies, fetchAdminAgencyById, createAdminAgency, updateAdminAgency, updateAdminAgencyStatus, requestAdminAgencyDeactivation
// Isolated asynchronous operations following Prof. Mallikarjun Reddy Sir's pattern.
import { agenciesApi, approvalsApi } from '../../services/api';
import { adminAgenciesActions } from './admin-agencies-slice';

export const fetchAdminAgencies = () => {
  return async (dispatch) => {
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
  };
};

export const fetchAdminAgencyById = (agencyId) => {
  return async (dispatch) => {
    dispatch(adminAgenciesActions.setLoading(true));
    dispatch(adminAgenciesActions.setError(null));
    try {
      const res = await agenciesApi.getById(agencyId);
      const data = res?.data ?? res;
      dispatch(adminAgenciesActions.setDetailedAgency(data));
      return data;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to fetch agency details.';
      dispatch(adminAgenciesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminAgenciesActions.setLoading(false));
    }
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
