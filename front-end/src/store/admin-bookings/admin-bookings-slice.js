// Admin bookings slice: stores read-only booking records, financial details, and related lookups.
// Pure synchronous Immer reducers; async requests live in admin-bookings-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  bookings: [],
  relatedTrips: [],
  relatedTravelers: [],
  relatedAgencies: [],
  relatedPayments: [],
  selectedBookingId: null,
  search: '',
  statusFilter: '',
  loading: false,
  error: null,
};

const adminBookingsSlice = createSlice({
  name: 'adminBookings',
  initialState,
  reducers: {
    setLoading(state, action) {
      state.loading = Boolean(action.payload);
    },
    setError(state, action) {
      state.error = action.payload ?? null;
    },
    clearError(state) {
      state.error = null;
    },
    setBookingsData(state, action) {
      state.bookings = Array.isArray(action.payload?.bookings) ? action.payload.bookings : [];
      state.relatedTrips = Array.isArray(action.payload?.trips) ? action.payload.trips : [];
      state.relatedTravelers = Array.isArray(action.payload?.travelers) ? action.payload.travelers : [];
      state.relatedAgencies = Array.isArray(action.payload?.agencies) ? action.payload.agencies : [];
      state.relatedPayments = Array.isArray(action.payload?.payments) ? action.payload.payments : [];
    },
    setSelectedBookingId(state, action) {
      state.selectedBookingId = action.payload ?? null;
    },
    clearSelectedBooking(state) {
      state.selectedBookingId = null;
    },
    setSearch(state, action) {
      state.search = action.payload ?? '';
    },
    setStatusFilter(state, action) {
      state.statusFilter = action.payload ?? '';
    },
    resetAdminBookings() {
      return initialState;
    },
  },
});

export const adminBookingsActions = adminBookingsSlice.actions;
export default adminBookingsSlice;
