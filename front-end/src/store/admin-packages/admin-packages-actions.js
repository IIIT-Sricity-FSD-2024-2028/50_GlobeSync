// Thunks: fetchAdminPackages, createAdminPackage, updateAdminPackage, archiveAdminPackage
// Isolated asynchronous API operations following Prof. Mallikarjun Reddy Sir's pattern.
import { packagesApi } from '../../services/api';
import { adminPackagesActions } from './admin-packages-slice';

export const fetchAdminPackages = () => {
  return async (dispatch) => {
    dispatch(adminPackagesActions.setLoading(true));
    dispatch(adminPackagesActions.setError(null));
    try {
      const res = await packagesApi.getAll();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      dispatch(adminPackagesActions.setPackages(list));
      return list;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load tour packages.';
      dispatch(adminPackagesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminPackagesActions.setLoading(false));
    }
  };
};

export const createAdminPackage = (payload) => {
  return async (dispatch) => {
    dispatch(adminPackagesActions.setLoading(true));
    dispatch(adminPackagesActions.setError(null));
    try {
      const res = await packagesApi.create(payload);
      const created = res?.data ?? res;
      dispatch(adminPackagesActions.addPackage(created));
      return created;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to create package.';
      dispatch(adminPackagesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminPackagesActions.setLoading(false));
    }
  };
};

export const updateAdminPackage = (packageId, payload) => {
  return async (dispatch) => {
    dispatch(adminPackagesActions.setLoading(true));
    dispatch(adminPackagesActions.setError(null));
    try {
      const res = await packagesApi.update(packageId, payload);
      const updated = res?.data ?? res;
      dispatch(adminPackagesActions.updatePackage(updated));
      return updated;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update package.';
      dispatch(adminPackagesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminPackagesActions.setLoading(false));
    }
  };
};

export const archiveAdminPackage = (packageId, reason) => {
  return async (dispatch) => {
    dispatch(adminPackagesActions.setLoading(true));
    dispatch(adminPackagesActions.setError(null));
    try {
      const res = await packagesApi.archive(packageId, reason);
      const data = res?.data ?? res ?? { packageId, status: 'archived', reason };
      dispatch(adminPackagesActions.archivePackage({ packageId, ...data }));
      return data;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to archive package.';
      dispatch(adminPackagesActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminPackagesActions.setLoading(false));
    }
  };
};
