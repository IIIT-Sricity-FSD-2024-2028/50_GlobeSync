import { configureStore } from '@reduxjs/toolkit';
import {
  agencies, agencyCommissions, bookings, expenses, guideDashboard, guides, itineraries, messages, packages, passengers,
  payments, refunds, reviews, supportDashboard, supportTickets, travelerDashboard, travelers, trips,
} from './resources';
import { superuserAgencies, superuserDashboard, superuserReports, superuserRevenue, superuserRules, superuserIntegrations, superuserPaymentMethods, superuserProfile, superuserUsers } from './superuserResources';

export const store = configureStore({
  reducer: {
    travelers: travelers.reducer, agencies: agencies.reducer, passengers: passengers.reducer,
    packages: packages.reducer, trips: trips.reducer, itineraries: itineraries.reducer,
    bookings: bookings.reducer, expenses: expenses.reducer, payments: payments.reducer,
    refunds: refunds.reducer, guides: guides.reducer, reviews: reviews.reducer,
    supportTickets: supportTickets.reducer, messages: messages.reducer,
    travelerDashboard: travelerDashboard.reducer,
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
