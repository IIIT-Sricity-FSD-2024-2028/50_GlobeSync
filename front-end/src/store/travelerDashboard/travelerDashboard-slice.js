// Traveler dashboard slice: stores aggregated traveler metrics and upcoming journeys.
// Pure synchronous Immer reducers; async requests live in travelerDashboard-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: null,
  loading: false,
  error: null,
};

const travelerDashboardSlice = createSlice({
  name: 'travelerDashboard',
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
    setDashboardData(state, action) {
      state.data = action.payload ?? null;
    },
    resetTravelerDashboard() {
      return initialState;
    },
  },
});

export const travelerDashboardActions = travelerDashboardSlice.actions;
export default travelerDashboardSlice;
