import { configureStore } from '@reduxjs/toolkit';
import authSlice from './auth/auth-slice';

// --- Admin Actor Slices (Professor's Pattern) ---
import adminDashboardSlice from './admin-dashboard/admin-dashboard-slice';
import adminPackagesSlice from './admin-packages/admin-packages-slice';
import adminBookingsSlice from './admin-bookings/admin-bookings-slice';
import adminTripsSlice from './admin-trips/admin-trips-slice';
import adminAgenciesSlice from './admin-agencies/admin-agencies-slice';
import adminGuidesSlice from './admin-guides/admin-guides-slice';
import adminReviewsSlice from './admin-reviews/admin-reviews-slice';
import adminReportsSlice from './admin-reports/admin-reports-slice';
import adminProfileSlice from './admin-profile/admin-profile-slice';
import adminUiSlice from './admin-ui/admin-ui-slice';
import travelerDashboardSlice from './travelerDashboard/travelerDashboard-slice';
import travelerTripsSlice from './travelerTrips/travelerTrips-slice';
import travelerBookingsSlice from './travelerBookings/travelerBookings-slice';
import travelerPackagesSlice from './travelerPackages/travelerPackages-slice';
import travelerExpensesSlice from './travelerExpenses/travelerExpenses-slice';
import travelerMessagesSlice from './travelerMessages/travelerMessages-slice';
import travelerProfileSlice from './travelerProfile/travelerProfile-slice';
import travelerSupportSlice from './travelerSupport/travelerSupport-slice';
import {
  agencies,
  agencyCommissions,
  agencyProfile,
  agencySupport,
  bookings,
  expenses,
  guideDashboard,
  guides,
  itineraries,
  messages,
  packages,
  passengers,
  payments,
  refunds,
  reviews,
  supportDashboard,
  supportTickets,
  travelers,
  trips,
} from './resources';
import {
  superuserAgencies,
  superuserDashboard,
  superuserReports,
  superuserRevenue,
  superuserRules,
  superuserIntegrations,
  superuserPaymentMethods,
  superuserProfile,
  superuserUsers,
} from './superuserResources';
import { supportProfile, supportRefunds, supportMessages } from './supportResources';

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    // --- Admin Actor ---
    adminDashboard: adminDashboardSlice.reducer,
    adminPackages: adminPackagesSlice.reducer,
    adminBookings: adminBookingsSlice.reducer,
    adminTrips: adminTripsSlice.reducer,
    adminAgencies: adminAgenciesSlice.reducer,
    adminGuides: adminGuidesSlice.reducer,
    adminReviews: adminReviewsSlice.reducer,
    adminReports: adminReportsSlice.reducer,
    adminProfile: adminProfileSlice.reducer,
    adminUi: adminUiSlice.reducer,
    travelerDashboard: travelerDashboardSlice.reducer,
    travelerTrips: travelerTripsSlice.reducer,
    travelerBookings: travelerBookingsSlice.reducer,
    travelerPackages: travelerPackagesSlice.reducer,
    travelerExpenses: travelerExpensesSlice.reducer,
    travelerMessages: travelerMessagesSlice.reducer,
    travelerProfile: travelerProfileSlice.reducer,
    travelerSupport: travelerSupportSlice.reducer,
    travelers: travelers.reducer,
    agencies: agencies.reducer,
    passengers: passengers.reducer,
    packages: packages.reducer,
    trips: trips.reducer,
    itineraries: itineraries.reducer,
    bookings: bookings.reducer,
    expenses: expenses.reducer,
    payments: payments.reducer,
    refunds: refunds.reducer,
    guides: guides.reducer,
    reviews: reviews.reducer,
    supportTickets: supportTickets.reducer,
    messages: messages.reducer,
    agencyCommissions: agencyCommissions.reducer,
    agencyProfile: agencyProfile.reducer,
    agencySupport: agencySupport.reducer,
    guideDashboard: guideDashboard.reducer,
    supportDashboard: supportDashboard.reducer,
    superuserAgencies: superuserAgencies.reducer,
    superuserDashboard: superuserDashboard.reducer,
    superuserReports: superuserReports.reducer,
    superuserRevenue: superuserRevenue.reducer,
    superuserRules: superuserRules.reducer,
    superuserIntegrations: superuserIntegrations.reducer,
    superuserPaymentMethods: superuserPaymentMethods.reducer,
    superuserProfile: superuserProfile.reducer,
    superuserUsers: superuserUsers.reducer,
    supportProfile: supportProfile.reducer,
    supportRefunds: supportRefunds.reducer,
    supportMessages: supportMessages.reducer,
  },
});

export { store };
export default store;
