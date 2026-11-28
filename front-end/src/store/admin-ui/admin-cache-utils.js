// Shared non-serializable in-flight request deduplication & cache-reset helpers for Admin thunks.
// Keeps Promises completely outside the Redux store while preventing duplicate concurrent/StrictMode GETs.
import { adminDashboardActions } from '../admin-dashboard/admin-dashboard-slice';
import { adminPackagesActions } from '../admin-packages/admin-packages-slice';
import { adminBookingsActions } from '../admin-bookings/admin-bookings-slice';
import { adminTripsActions } from '../admin-trips/admin-trips-slice';
import { adminAgenciesActions } from '../admin-agencies/admin-agencies-slice';
import { adminGuidesActions } from '../admin-guides/admin-guides-slice';
import { adminReviewsActions } from '../admin-reviews/admin-reviews-slice';
import { adminReportsActions } from '../admin-reports/admin-reports-slice';
import { adminProfileActions } from '../admin-profile/admin-profile-slice';
import { adminUiActions } from './admin-ui-slice';

const inFlightRequests = new Map();

/**
 * Deduplicates concurrent async operations by key (e.g. React StrictMode double-mounts
 * or multiple components requesting the same dataset simultaneously).
 */
export function runDeduplicated(key, factory) {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }
  const promise = Promise.resolve()
    .then(factory)
    .finally(() => {
      inFlightRequests.delete(key);
    });
  inFlightRequests.set(key, promise);
  return promise;
}

export function clearInFlightRequests() {
  inFlightRequests.clear();
}

/**
 * Clears all Admin Redux caches on logout, session expiration, or account switch.
 */
export const resetAllAdminCaches = () => {
  return (dispatch) => {
    clearInFlightRequests();
    dispatch(adminDashboardActions.resetAdminDashboard());
    dispatch(adminPackagesActions.resetAdminPackages());
    dispatch(adminBookingsActions.resetAdminBookings());
    dispatch(adminTripsActions.resetAdminTrips());
    dispatch(adminAgenciesActions.resetAdminAgencies());
    dispatch(adminGuidesActions.resetAdminGuides());
    dispatch(adminReviewsActions.resetAdminReviews());
    dispatch(adminReportsActions.resetAdminReports());
    dispatch(adminProfileActions.resetAdminProfile());
    dispatch(adminUiActions.resetAdminUi ? adminUiActions.resetAdminUi() : { type: 'adminUi/noop' });
  };
};
