/**
 * Admin actor — dedicated Redux slices & actions (Prof. Mallikarjun Reddy Sir's pattern).
 * Re-exports slices and manual thunks from domain folders under src/store/.
 */

// Dashboard
export {
  default as adminDashboardSlice,
  adminDashboardActions,
} from '../../admin-dashboard/admin-dashboard-slice';
export { fetchAdminDashboard } from '../../admin-dashboard/admin-dashboard-actions';

// Packages
export {
  default as adminPackagesSlice,
  adminPackagesActions,
} from '../../admin-packages/admin-packages-slice';
export {
  fetchAdminPackages,
  createAdminPackage,
  updateAdminPackage,
  archiveAdminPackage,
} from '../../admin-packages/admin-packages-actions';

// Bookings
export {
  default as adminBookingsSlice,
  adminBookingsActions,
} from '../../admin-bookings/admin-bookings-slice';
export { fetchAdminBookings } from '../../admin-bookings/admin-bookings-actions';

// Trips
export {
  default as adminTripsSlice,
  adminTripsActions,
} from '../../admin-trips/admin-trips-slice';
export {
  fetchAdminTrips,
  requestAdminGuideReassignment,
} from '../../admin-trips/admin-trips-actions';

// Agencies
export {
  default as adminAgenciesSlice,
  adminAgenciesActions,
} from '../../admin-agencies/admin-agencies-slice';
export {
  fetchAdminAgencies,
  fetchAdminAgencyById,
  createAdminAgency,
  updateAdminAgency,
  updateAdminAgencyStatus,
  requestAdminAgencyDeactivation,
} from '../../admin-agencies/admin-agencies-actions';

// Guides
export {
  default as adminGuidesSlice,
  adminGuidesActions,
} from '../../admin-guides/admin-guides-slice';
export {
  fetchAdminGuides,
  createAdminGuide,
  updateAdminGuide,
  verifyAdminGuide,
  requestAdminGuideDeactivation,
} from '../../admin-guides/admin-guides-actions';

// Reviews
export {
  default as adminReviewsSlice,
  adminReviewsActions,
} from '../../admin-reviews/admin-reviews-slice';
export {
  fetchAdminReviews,
  deleteAdminReview,
} from '../../admin-reviews/admin-reviews-actions';

// Reports
export {
  default as adminReportsSlice,
  adminReportsActions,
} from '../../admin-reports/admin-reports-slice';
export { fetchAdminReports } from '../../admin-reports/admin-reports-actions';

// Profile
export {
  default as adminProfileSlice,
  adminProfileActions,
} from '../../admin-profile/admin-profile-slice';
export {
  fetchAdminProfile,
  updateAdminProfile,
} from '../../admin-profile/admin-profile-actions';

// UI
export {
  default as adminUiSlice,
  adminUiActions,
} from '../../admin-ui/admin-ui-slice';
