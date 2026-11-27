// Traveler packages slice: stores curated tour packages for browsing and trip planning.
// Pure synchronous Immer reducers; async requests live in travelerPackages-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  packages: [],
  loading: false,
  error: null,
};

const travelerPackagesSlice = createSlice({
  name: 'travelerPackages',
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
    setPackages(state, action) {
      state.packages = Array.isArray(action.payload) ? action.payload : [];
    },
    resetTravelerPackages() {
      return initialState;
    },
  },
});

export const travelerPackagesActions = travelerPackagesSlice.actions;
export default travelerPackagesSlice;
