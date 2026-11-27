import { configureStore } from '@reduxjs/toolkit';
import authSlice from './auth/auth-slice';
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

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
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
  },
});

export { store };
export default store;
