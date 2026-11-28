// Stable selector naming convention: select<Actor><Resource>.
export const selectTravelerTrips = (state) => state.trips.items;
export const selectTravelerBookings = (state) => state.bookings.items;
export const selectTravelerPackages = (state) => state.packages.items;
export const selectAgencyTrips = (state) => state.trips.items;
export const selectAgencyBookings = (state) => state.bookings.items;
export const selectGuideTrips = (state) => state.trips.items;
export const selectSupportTickets = (state) => state.supportTickets.items;
export const selectSuperuserAgencies = (state) => state.agencies.items;

export const selectResourceStatus = (resource) => (state) => state[resource]?.status ?? 'idle';
export const selectResourceError = (resource) => (state) => state[resource]?.error ?? null;

// ---------------------------------------------------------------------------
// Admin Actor Selectors (Prof. Mallikarjun Reddy Sir's Pattern)
// ---------------------------------------------------------------------------

// Dashboard
export const selectAdminDashboardMetrics = (state) => state.adminDashboard?.metrics;
export const selectAdminDashboardLoading = (state) => Boolean(state.adminDashboard?.loading);
export const selectAdminDashboardError = (state) => state.adminDashboard?.error;

// Packages
export const selectAdminPackages = (state) => state.adminPackages?.packages || [];
export const selectAdminPackageById = (state, packageId) =>
  (state.adminPackages?.packages || []).find((p) => (p.packageId || p.id) === packageId) || null;
export const selectAdminFilteredPackages = (state) => {
  const list = state.adminPackages?.packages || [];
  const q = (state.adminPackages?.search || '').trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (pkg) =>
      (pkg.name ?? '').toLowerCase().includes(q) ||
      (pkg.destinations ?? '').toLowerCase().includes(q) ||
      String(pkg.packageId ?? '').includes(q)
  );
};
export const selectAdminPackagesLoading = (state) => Boolean(state.adminPackages?.loading);
export const selectAdminPackagesError = (state) => state.adminPackages?.error;
export const selectAdminPackageModal = (state) => state.adminPackages?.modal;

// Bookings
export const selectAdminBookings = (state) => state.adminBookings?.bookings || [];
export const selectAdminBookingsByTripId = (state, tripId) =>
  (state.adminBookings?.bookings || []).filter((b) => b.tripId === tripId);
export const selectAdminFilteredBookings = (state) => {
  const list = state.adminBookings?.bookings || [];
  const statusFilter = state.adminBookings?.statusFilter || '';
  const q = (state.adminBookings?.search || '').trim().toLowerCase();
  return list.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (!q) return true;
    return (
      String(b.bookingId ?? '').toLowerCase().includes(q) ||
      (b.service ?? '').toLowerCase().includes(q)
    );
  });
};
export const selectAdminBookingsLoading = (state) => Boolean(state.adminBookings?.loading);
export const selectAdminBookingsError = (state) => state.adminBookings?.error;

// Trips
export const selectAdminTrips = (state) => state.adminTrips?.trips || [];
export const selectAdminTripById = (state, tripId) =>
  (state.adminTrips?.trips || []).find((t) => (t.tripId || t.id) === tripId) || null;
export const selectAdminTripDetailsById = (state, tripId) =>
  tripId != null ? state.adminTrips?.detailsByTripId?.[tripId] || null : null;
export const selectAdminTripsLoading = (state) => Boolean(state.adminTrips?.loading);
export const selectAdminTripsError = (state) => state.adminTrips?.error;

// Agencies
export const selectAdminAgencies = (state) => state.adminAgencies?.agencies || [];
export const selectAdminAgencyById = (state, agencyId) =>
  (state.adminAgencies?.agencies || []).find((a) => (a.agencyId || a.id) === agencyId) || null;
export const selectAdminAgencyDetailsById = (state, agencyId) =>
  agencyId != null ? state.adminAgencies?.detailsByAgencyId?.[agencyId]?.data || null : null;
export const selectAdminAgenciesLoading = (state) => Boolean(state.adminAgencies?.loading);
export const selectAdminAgenciesError = (state) => state.adminAgencies?.error;

// Guides
export const selectAdminGuides = (state) => state.adminGuides?.guides || [];
export const selectAdminGuideById = (state, guideId) =>
  (state.adminGuides?.guides || []).find((g) => (g.guideId || g.id) === guideId) || null;
export const selectAdminGuidesLoading = (state) => Boolean(state.adminGuides?.loading);
export const selectAdminGuidesError = (state) => state.adminGuides?.error;

// Reviews
export const selectAdminReviews = (state) => state.adminReviews?.reviews || [];
export const selectAdminReviewsLoading = (state) => Boolean(state.adminReviews?.loading);
export const selectAdminReviewsError = (state) => state.adminReviews?.error;

// Reports
export const selectAdminReports = (state) => state.adminReports;
export const selectAdminReportsLoading = (state) => Boolean(state.adminReports?.loading);
export const selectAdminReportsError = (state) => state.adminReports?.error;

// Profile
export const selectAdminProfile = (state) => state.adminProfile?.profile;
export const selectAdminProfileLoading = (state) => Boolean(state.adminProfile?.loading);
export const selectAdminProfileError = (state) => state.adminProfile?.error;

// UI
export const selectAdminSidebarCollapsed = (state) => Boolean(state.adminUi?.sidebarCollapsed);
export const selectAdminActiveTab = (state) => state.adminUi?.activeTab;
export const selectAdminNotification = (state) => state.adminUi?.notification;
