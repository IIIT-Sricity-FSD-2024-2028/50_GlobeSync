# Admin Button-to-Redux Mapping (Professor's Pattern)

All user interactions dispatch pure synchronous slice actions or manual asynchronous thunks:

## 1. AdminDashboardPage
- **Page Mount / Refresh**: dispatches `fetchAdminDashboard()`

## 2. AdminPackagesPage
- **Page Mount / Refresh**: dispatches `fetchAdminPackages()`
- **Search Query Input**: dispatches `adminPackagesActions.setSearch(val)`
- **"➕ Create Package" Button**: dispatches `adminPackagesActions.openCreateModal()`
- **"Edit" Button**: dispatches `adminPackagesActions.openEditModal(pkg.packageId)`
- **"Archive" Button**: dispatches `adminPackagesActions.openArchiveModal(pkg.packageId)`
- **Modal Close**: dispatches `adminPackagesActions.closeModal()`
- **Package Form Submit**: dispatches `createAdminPackage(formData)` or `updateAdminPackage(id, formData)`
- **Archive Dialog Confirm**: dispatches `archiveAdminPackage(id, reason)`

## 3. AdminBookingsPage
- **Page Mount / Refresh**: dispatches `fetchAdminBookings()`
- **Search Query Input**: dispatches `adminBookingsActions.setSearch(val)`
- **Status Filter Select**: dispatches `adminBookingsActions.setStatusFilter(val)`
- **"Inspect" Button**: dispatches `adminBookingsActions.setSelectedBookingId(b.bookingId)`
- **Inspection Modal Close**: dispatches `adminBookingsActions.clearSelectedBooking()`

## 4. AdminTripsPage
- **Page Mount / Refresh**: dispatches `fetchAdminTrips()`
- **Search Query Input**: dispatches `adminTripsActions.setSearch(val)`
- **Status Filter Select**: dispatches `adminTripsActions.setStatusFilter(val)`
- **"Inspect" Button**: dispatches `adminTripsActions.setSelectedTripId(t.tripId)`
- **"Reassign Guide" Button**: dispatches `adminTripsActions.setReassigningTripId(t.tripId)`
- **Reassignment Modal Close**: dispatches `adminTripsActions.clearReassigningTrip()`
- **Reassignment Submit**: dispatches `requestAdminGuideReassignment(id, payload)`

## 5. AdminAgenciesPage
- **Page Mount / Refresh**: dispatches `fetchAdminAgencies()`
- **Search Query Input**: dispatches `adminAgenciesActions.setSearch(val)`
- **Status Filter Select**: dispatches `adminAgenciesActions.setStatusFilter(val)`
- **"Create agency" Button**: dispatches `adminAgenciesActions.openFormModal(null)`
- **"View Application" / "View"**: dispatches `fetchAdminAgencyById(agencyId)`
- **"Approve / Reject" / "Suspend / Rate"**: dispatches `adminAgenciesActions.openStatusModal(agencyId)`
- **"Edit" Button**: dispatches `adminAgenciesActions.openFormModal(agencyId)`
- **"Deactivate" Button**: dispatches `adminAgenciesActions.openDeactivateModal(agencyId)`
- **Agency Form Submit**: dispatches `createAdminAgency(data)` or `updateAdminAgency(id, data)`
- **Status Form Submit**: dispatches `updateAdminAgencyStatus(id, data)`
- **Deactivate Request Submit**: dispatches `requestAdminAgencyDeactivation(id, reason)`

## 6. AdminGuidesPage
- **Page Mount / Refresh**: dispatches `fetchAdminGuides()`
- **Search Query Input**: dispatches `adminGuidesActions.setGuideSearch(val)`
- **"Register Guide" Button**: dispatches `adminGuidesActions.openFormModal(null)`
- **"View" Button**: dispatches `adminGuidesActions.openViewModal(guideId)`
- **"Verify" Button**: dispatches `adminGuidesActions.openVerifyModal(guideId)`
- **"Edit" Button**: dispatches `adminGuidesActions.openFormModal(guideId)`
- **"Deactivate" Button**: dispatches `adminGuidesActions.openDeactivateModal(guideId)`
- **Guide Form Submit**: dispatches `createAdminGuide(data)` or `updateAdminGuide(id, data)`
- **Verify Submit**: dispatches `verifyAdminGuide(id, verifyDto)`
- **Deactivate Submit**: dispatches `requestAdminGuideDeactivation(id, reason)`

## 7. AdminReviewsPage
- **Page Mount / Refresh**: dispatches `fetchAdminReviews()`
- **Search Query Input**: dispatches `adminReviewsActions.setSearch(val)`
- **Rating Filter Select**: dispatches `adminReviewsActions.setRatingFilter(val)`
- **"Delete review" Button**: dispatches `adminReviewsActions.setDeletingReviewId(reviewId)`
- **Delete Confirmation Confirm**: dispatches `deleteAdminReview(reviewId)`

## 8. AdminReportsPage
- **Page Mount / Refresh**: dispatches `fetchAdminReports()`
- **Transaction Search Input**: dispatches `adminReportsActions.setTransactionSearch(val)`
- **Transaction Status Select**: dispatches `adminReportsActions.setTransactionStatus(val)`
- **Export Transactions CSV**: dispatches `adminReportsActions.setExportStatus('exporting' | 'idle')`
- **Export Trips CSV**: dispatches `adminReportsActions.setExportStatus('exporting' | 'idle')`

## 9. AdminProfilePage
- **Page Mount / Refresh**: dispatches `fetchAdminProfile(adminId)`
- **Name Input**: dispatches `adminProfileActions.setForm({ name: val })`
- **Email Input**: dispatches `adminProfileActions.setForm({ email: val })`
- **"Save profile" Button**: dispatches `updateAdminProfile(adminId, data)`
