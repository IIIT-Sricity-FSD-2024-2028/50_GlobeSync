// Thunk: fetchAdminDashboard
// Isolated asynchronous API operation following Prof. Mallikarjun Reddy Sir's pattern.
import { dashboardApi } from '../../services/api';
import { adminDashboardActions } from './admin-dashboard-slice';

export const fetchAdminDashboard = () => {
  return async (dispatch) => {
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
  };
};
