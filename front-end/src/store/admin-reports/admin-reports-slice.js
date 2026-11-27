// Admin reports slice: stores aggregated financial and operational data across 8 endpoints.
// Pure synchronous Immer reducers; async requests live in admin-reports-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  dashboard: null,
  trips: [],
  bookings: [],
  reviews: [],
  overview: null,
  breakdown: {},
  transactions: [],
  config: [],
  partialFailures: [],
  transactionSearch: '',
  transactionStatus: 'all',
  exportStatus: 'idle',
  loading: false,
  error: null,
};

const adminReportsSlice = createSlice({
  name: 'adminReports',
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
    setReportsData(state, action) {
      state.dashboard = action.payload?.dashboard ?? null;
      state.trips = Array.isArray(action.payload?.trips) ? action.payload.trips : [];
      state.bookings = Array.isArray(action.payload?.bookings) ? action.payload.bookings : [];
      state.reviews = Array.isArray(action.payload?.reviews) ? action.payload.reviews : [];
      state.overview = action.payload?.overview ?? null;
      state.breakdown = action.payload?.breakdown ?? {};
      state.transactions = Array.isArray(action.payload?.transactions) ? action.payload.transactions : [];
      state.config = Array.isArray(action.payload?.config) ? action.payload.config : [];
      state.partialFailures = Array.isArray(action.payload?.partialFailures) ? action.payload.partialFailures : [];
    },
    setTransactionSearch(state, action) {
      state.transactionSearch = action.payload ?? '';
    },
    setTransactionStatus(state, action) {
      state.transactionStatus = action.payload ?? 'all';
    },
    setExportStatus(state, action) {
      state.exportStatus = action.payload ?? 'idle';
    },
    resetAdminReports() {
      return initialState;
    },
  },
});

export const adminReportsActions = adminReportsSlice.actions;
export default adminReportsSlice;
