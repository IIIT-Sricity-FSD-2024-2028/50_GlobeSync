// Thunk: fetchAdminReports
// Composite reports loader across 8 endpoints using Promise.allSettled.
import {
  dashboardApi,
  tripsApi,
  bookingsApi,
  reviewsApi,
  revenueApi,
} from '../../services/api';
import { adminReportsActions } from './admin-reports-slice';

export const fetchAdminReports = () => {
  return async (dispatch, getState) => {
    dispatch(adminReportsActions.setLoading(true));
    dispatch(adminReportsActions.setError(null));
    try {
      const { dateRange } = getState().adminReports || {};
      const [
        dashboardRes,
        tripsRes,
        bookingsRes,
        reviewsRes,
        overviewRes,
        breakdownRes,
        transactionsRes,
        configRes,
      ] = await Promise.allSettled([
        dashboardApi.getAdmin(),
        tripsApi.getAll(),
        bookingsApi.getAll(),
        reviewsApi.getAll(),
        revenueApi.getOverview(),
        revenueApi.getBreakdown(),
        revenueApi.getTransactions(),
        revenueApi.getConfig(),
      ]);

      const partialFailures = [];
      const extract = (res, label, fallback) => {
        if (res.status === 'fulfilled') return res.value?.data ?? res.value ?? fallback;
        partialFailures.push(label);
        return fallback;
      };

      const result = {
        dashboard: extract(dashboardRes, 'Dashboard metrics', null),
        trips: extract(tripsRes, 'Trips', []),
        bookings: extract(bookingsRes, 'Bookings', []),
        reviews: extract(reviewsRes, 'Reviews', []),
        overview: extract(overviewRes, 'Revenue overview', null),
        breakdown: extract(breakdownRes, 'Revenue breakdown', {}),
        transactions: extract(transactionsRes, 'Transactions', []),
        config: extract(configRes, 'Revenue config', []),
        partialFailures,
      };

      dispatch(adminReportsActions.setReportsData(result));
      return result;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load report analytics.';
      dispatch(adminReportsActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminReportsActions.setLoading(false));
    }
  };
};
