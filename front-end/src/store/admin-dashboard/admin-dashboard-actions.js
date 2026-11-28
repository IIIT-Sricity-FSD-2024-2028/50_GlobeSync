// Thunk: fetchAdminDashboard
// Cache-aware manual thunk following Prof. Mallikarjun Reddy Sir's pattern.
import { dashboardApi } from '../../services/api';
import { adminDashboardActions } from './admin-dashboard-slice';
import { runDeduplicated } from '../admin-ui/admin-cache-utils';

export const fetchAdminDashboard = ({ force = false } = {}) => {
  return async (dispatch, getState) => {
    const state = getState().adminDashboard;
    if (state?.loaded && !state.stale && !force) {
      return state.metrics;
    }

    return runDeduplicated('adminDashboard:fetch', async () => {
      const latest = getState().adminDashboard;
      if (latest?.loaded && !latest.stale && !force) {
        return latest.metrics;
      }

      dispatch(adminDashboardActions.setLoading(true));
      dispatch(adminDashboardActions.setError(null));
      try {
        const res = await dashboardApi.getAdmin();
        const metrics = res?.data ?? res ?? null;
        dispatch(adminDashboardActions.setMetrics(metrics));
        return metrics;
      } catch (err) {
        const msg = err?.response?.data?.message || err.message || 'Failed to fetch dashboard metrics.';
        dispatch(adminDashboardActions.setError(msg));
        throw err;
      } finally {
        dispatch(adminDashboardActions.setLoading(false));
      }
    });
  };
};
