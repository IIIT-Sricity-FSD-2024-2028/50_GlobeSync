// Thunks: fetchTravelerDashboard
import { dashboardApi } from '../../services/api';
import { travelerDashboardActions } from './travelerDashboard-slice';

export const fetchTravelerDashboard = (travelerId) => {
  return async (dispatch) => {
    dispatch(travelerDashboardActions.setLoading(true));
    dispatch(travelerDashboardActions.setError(null));
    try {
      const data = await dashboardApi.getTraveler(travelerId);
      dispatch(travelerDashboardActions.setDashboardData(data));
      return data;
    } catch (err) {
      if (!err?.isCancelled) {
        dispatch(travelerDashboardActions.setError(err.message || 'Failed to load dashboard metrics.'));
      }
      return null;
    } finally {
      dispatch(travelerDashboardActions.setLoading(false));
    }
  };
};
