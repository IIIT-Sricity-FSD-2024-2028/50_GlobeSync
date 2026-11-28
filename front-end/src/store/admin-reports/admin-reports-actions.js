// Thunk: fetchAdminReports
// Cache-aware composite reports loader reusing canonical dashboard, trips, bookings & reviews caches.
import { revenueApi } from '../../services/api';
import { adminReportsActions } from './admin-reports-slice';
import { fetchAdminDashboard } from '../admin-dashboard/admin-dashboard-actions';
import { fetchAdminTrips } from '../admin-trips/admin-trips-actions';
import { fetchAdminBookings } from '../admin-bookings/admin-bookings-actions';
import { fetchAdminReviews } from '../admin-reviews/admin-reviews-actions';
import { runDeduplicated } from '../admin-ui/admin-cache-utils';

export const fetchAdminReports = ({ force = false } = {}) => {
  return async (dispatch, getState) => {
    const state = getState().adminReports;
    if (state?.loaded && !state.stale && !force) {
      return {
        dashboard: getState().adminDashboard?.metrics ?? state.dashboard,
        trips: getState().adminTrips?.trips || state.trips,
        bookings: getState().adminBookings?.bookings || state.bookings,
        reviews: getState().adminReviews?.reviews || state.reviews,
        overview: state.overview,
        breakdown: state.breakdown,
        transactions: state.transactions,
        config: state.config,
        partialFailures: state.partialFailures,
      };
    }

    return runDeduplicated('adminReports:fetch', async () => {
      const latest = getState().adminReports;
      if (latest?.loaded && !latest.stale && !force) {
        return latest;
      }

      dispatch(adminReportsActions.setLoading(true));
      dispatch(adminReportsActions.setError(null));
      try {
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
          dispatch(fetchAdminDashboard({ force })),
          dispatch(fetchAdminTrips({ force })),
          dispatch(fetchAdminBookings({ force })),
          dispatch(fetchAdminReviews({ force })),
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

        const dashboard =
          dashboardRes.status === 'fulfilled'
            ? dashboardRes.value ?? getState().adminDashboard?.metrics ?? null
            : (partialFailures.push('Dashboard metrics'), null);

        const trips =
          tripsRes.status === 'fulfilled'
            ? tripsRes.value?.trips || getState().adminTrips?.trips || []
            : (partialFailures.push('Trips'), []);

        const bookings =
          bookingsRes.status === 'fulfilled'
            ? bookingsRes.value?.bookings || getState().adminBookings?.bookings || []
            : (partialFailures.push('Bookings'), []);

        const reviews =
          reviewsRes.status === 'fulfilled'
            ? reviewsRes.value?.reviews || getState().adminReviews?.reviews || []
            : (partialFailures.push('Reviews'), []);

        const result = {
          dashboard,
          trips,
          bookings,
          reviews,
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
    });
  };
};
