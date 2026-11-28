// Admin dashboard slice: stores high-level operational and financial metrics.
// Pure synchronous Immer reducers; async requests live in admin-dashboard-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  metrics: null,
  loaded: false,
  stale: false,
  lastFetchedAt: null,
  loading: false,
  error: null,
};

const adminDashboardSlice = createSlice({
  name: 'adminDashboard',
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
    setMetrics(state, action) {
      state.metrics = action.payload ?? null;
      state.loaded = true;
      state.stale = false;
      state.lastFetchedAt = Date.now();
    },
    markStale(state) {
      state.stale = true;
    },
    resetAdminDashboard() {
      return initialState;
    },
  },
});

export const adminDashboardActions = adminDashboardSlice.actions;
export default adminDashboardSlice;
