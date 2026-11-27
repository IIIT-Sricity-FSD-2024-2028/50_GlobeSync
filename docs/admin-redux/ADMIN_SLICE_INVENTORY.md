# Admin Slice Inventory (Professor's Pattern)

All 10 Admin slices use `createSlice` with pure synchronous Immer reducers:

### 1. `adminDashboardSlice`
- **Location**: `src/store/admin-dashboard/admin-dashboard-slice.js`
- **Actions**: `src/store/admin-dashboard/admin-dashboard-actions.js`
- **State**: `{ metrics: null, loading: false, error: null }`
- **Reducers**: `setLoading`, `setError`, `clearError`, `setMetrics`, `resetAdminDashboard`
- **Exports**: `adminDashboardActions`, `default adminDashboardSlice`

### 2. `adminPackagesSlice`
- **Location**: `src/store/admin-packages/admin-packages-slice.js`
- **Actions**: `src/store/admin-packages/admin-packages-actions.js`
- **State**: `{ packages: [], selectedPackageId: null, search: '', statusFilter: 'all', modal: { createOpen, editOpen, archiveOpen }, archiveReason: '', loading: false, error: null }`
- **Reducers**: `setLoading`, `setError`, `clearError`, `setPackages`, `addPackage`, `updatePackage`, `archivePackage`, `setSelectedPackageId`, `setSearch`, `setStatusFilter`, `setArchiveReason`, `openCreateModal`, `openEditModal`, `openArchiveModal`, `closeModal`, `resetAdminPackages`
- **Exports**: `adminPackagesActions`, `default adminPackagesSlice`

### 3. `adminBookingsSlice`
- **Location**: `src/store/admin-bookings/admin-bookings-slice.js`
- **Actions**: `src/store/admin-bookings/admin-bookings-actions.js`
- **State**: `{ bookings: [], relatedTrips: [], relatedTravelers: [], relatedAgencies: [], relatedPayments: [], selectedBookingId: null, search: '', statusFilter: '', loading: false, error: null }`
- **Reducers**: `setLoading`, `setError`, `clearError`, `setBookingsData`, `setSelectedBookingId`, `clearSelectedBooking`, `setSearch`, `setStatusFilter`, `resetAdminBookings`
- **Exports**: `adminBookingsActions`, `default adminBookingsSlice`

### 4. `adminTripsSlice`
- **Location**: `src/store/admin-trips/admin-trips-slice.js`
- **Actions**: `src/store/admin-trips/admin-trips-actions.js`
- **State**: `{ trips: [], relatedTravelers: [], relatedAgencies: [], relatedGuides: [], relatedPackages: [], selectedTripId: null, reassigningTripId: null, search: '', statusFilter: '', loading: false, error: null }`
- **Reducers**: `setLoading`, `setError`, `clearError`, `setTripsData`, `updateTripGuide`, `setSelectedTripId`, `clearSelectedTrip`, `setReassigningTripId`, `clearReassigningTrip`, `setSearch`, `setStatusFilter`, `resetAdminTrips`
- **Exports**: `adminTripsActions`, `default adminTripsSlice`

### 5. `adminAgenciesSlice`
- **Location**: `src/store/admin-agencies/admin-agencies-slice.js`
- **Actions**: `src/store/admin-agencies/admin-agencies-actions.js`
- **State**: `{ agencies: [], selectedAgencyId: null, detailedAgency: null, search: '', statusFilter: '', deactivationReason: '', modal: { formOpen, statusOpen, detailsOpen, deactivateOpen }, loading: false, error: null }`
- **Reducers**: `setLoading`, `setError`, `clearError`, `setAgencies`, `addAgency`, `updateAgency`, `setDetailedAgency`, `setSelectedAgencyId`, `setSearch`, `setStatusFilter`, `setDeactivationReason`, `openFormModal`, `closeFormModal`, `openStatusModal`, `closeStatusModal`, `openDetailsModal`, `closeDetailsModal`, `openDeactivateModal`, `closeDeactivateModal`, `resetAdminAgencies`
- **Exports**: `adminAgenciesActions`, `default adminAgenciesSlice`

### 6. `adminGuidesSlice`
- **Location**: `src/store/admin-guides/admin-guides-slice.js`
- **Actions**: `src/store/admin-guides/admin-guides-actions.js`
- **State**: `{ guides: [], relatedPackages: [], selectedGuideId: null, verifyingGuideId: null, search: '', deactivationReason: '', verificationForm: { proofUrl, expYears, rateMinor }, modal: { formOpen, verifyOpen, deactivateOpen, viewOpen }, loading: false, error: null }`
- **Reducers**: `setLoading`, `setError`, `clearError`, `setGuidesData`, `addGuide`, `updateGuide`, `setSelectedGuideId`, `setVerifyingGuideId`, `setSearch`, `setDeactivationReason`, `setVerificationForm`, `openFormModal`, `closeFormModal`, `openVerifyModal`, `closeVerifyModal`, `openDeactivateModal`, `closeDeactivateModal`, `openViewModal`, `closeViewModal`, `resetAdminGuides`
- **Exports**: `adminGuidesActions`, `default adminGuidesSlice`

### 7. `adminReviewsSlice`
- **Location**: `src/store/admin-reviews/admin-reviews-slice.js`
- **Actions**: `src/store/admin-reviews/admin-reviews-actions.js`
- **State**: `{ reviews: [], relatedTrips: [], relatedGuides: [], deletingReviewId: null, search: '', ratingFilter: 'all', loading: false, error: null }`
- **Reducers**: `setLoading`, `setError`, `clearError`, `setReviewsData`, `removeReview`, `setDeletingReviewId`, `clearDeletingReview`, `setSearch`, `setRatingFilter`, `resetAdminReviews`
- **Exports**: `adminReviewsActions`, `default adminReviewsSlice`

### 8. `adminReportsSlice`
- **Location**: `src/store/admin-reports/admin-reports-slice.js`
- **Actions**: `src/store/admin-reports/admin-reports-actions.js`
- **State**: `{ dashboard: null, trips: [], bookings: [], reviews: [], overview: null, breakdown: {}, transactions: [], config: [], partialFailures: [], transactionSearch: '', transactionStatus: 'all', exportStatus: 'idle', loading: false, error: null }`
- **Reducers**: `setLoading`, `setError`, `clearError`, `setReportsData`, `setTransactionSearch`, `setTransactionStatus`, `setExportStatus`, `resetAdminReports`
- **Exports**: `adminReportsActions`, `default adminReportsSlice`

### 9. `adminProfileSlice`
- **Location**: `src/store/admin-profile/admin-profile-slice.js`
- **Actions**: `src/store/admin-profile/admin-profile-actions.js`
- **State**: `{ profile: null, form: { name: '', email: '' }, isDirty: false, loading: false, error: null }`
- **Reducers**: `setLoading`, `setError`, `clearError`, `setProfile`, `setForm`, `resetForm`, `resetAdminProfile`
- **Exports**: `adminProfileActions`, `default adminProfileSlice`

### 10. `adminUiSlice`
- **Location**: `src/store/admin-ui/admin-ui-slice.js`
- **State**: `{ sidebarCollapsed: false, activeTab: null, notification: null }`
- **Reducers**: `setSidebarCollapsed`, `toggleSidebar`, `setActiveTab`, `setNotification`, `clearNotification`, `resetAdminUi`
- **Exports**: `adminUiActions`, `default adminUiSlice`
