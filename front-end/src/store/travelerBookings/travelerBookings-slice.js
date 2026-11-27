// Traveler bookings slice: stores traveler bookings and reviewed booking IDs.
// Pure synchronous Immer reducers; async requests live in travelerBookings-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  bookings: [],
  reviewedBookingIds: [],
  loading: false,
  error: null,
};

const travelerBookingsSlice = createSlice({
  name: 'travelerBookings',
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
    setBookings(state, action) {
      state.bookings = Array.isArray(action.payload) ? action.payload : [];
    },
    setReviewedBookingIds(state, action) {
      state.reviewedBookingIds = Array.isArray(action.payload) ? action.payload : [];
    },
    addBooking(state, action) {
      if (action.payload) state.bookings.unshift(action.payload);
    },
    updateBooking(state, action) {
      const updated = action.payload;
      const targetId = updated?.bookingId || updated?.id;
      const idx = state.bookings.findIndex((b) => (b.bookingId || b.id) === targetId);
      if (idx >= 0) state.bookings[idx] = { ...state.bookings[idx], ...updated };
    },
    addReviewedBookingId(state, action) {
      if (action.payload && !state.reviewedBookingIds.includes(action.payload)) {
        state.reviewedBookingIds.push(action.payload);
      }
    },
    resetTravelerBookings() {
      return initialState;
    },
  },
});

export const travelerBookingsActions = travelerBookingsSlice.actions;
export default travelerBookingsSlice;
