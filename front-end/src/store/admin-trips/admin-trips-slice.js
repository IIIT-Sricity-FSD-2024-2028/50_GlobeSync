// Admin trips slice: stores trips, associated entities, and guide reassignment modal states.
// Pure synchronous Immer reducers; async requests live in admin-trips-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  trips: [],
  relatedTravelers: [],
  relatedAgencies: [],
  relatedGuides: [],
  relatedPackages: [],
  selectedTripId: null,
  selectedTripBookings: [],
  reassignmentHistory: [],
  detailsLoading: false,
  reassigningTripId: null,
  search: '',
  statusFilter: '',
  loading: false,
  error: null,
};

const adminTripsSlice = createSlice({
  name: 'adminTrips',
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
    setTripsData(state, action) {
      state.trips = Array.isArray(action.payload?.trips) ? action.payload.trips : [];
      state.relatedTravelers = Array.isArray(action.payload?.travelers) ? action.payload.travelers : [];
      state.relatedAgencies = Array.isArray(action.payload?.agencies) ? action.payload.agencies : [];
      state.relatedGuides = Array.isArray(action.payload?.guides) ? action.payload.guides : [];
      state.relatedPackages = Array.isArray(action.payload?.packages) ? action.payload.packages : [];
    },
    updateTripGuide(state, action) {
      const { tripId, guideId, guideStatus } = action.payload || {};
      const idx = state.trips.findIndex((t) => (t.tripId || t.id) === tripId);
      if (idx >= 0) {
        state.trips[idx] = {
          ...state.trips[idx],
          guideId: guideId ?? state.trips[idx].guideId,
          guideStatus: guideStatus ?? 'Pending',
        };
      }
    },
    setSelectedTripId(state, action) {
      state.selectedTripId = action.payload ?? null;
    },
    clearSelectedTrip(state) {
      state.selectedTripId = null;
      state.selectedTripBookings = [];
      state.reassignmentHistory = [];
      state.detailsLoading = false;
    },
    setDetailsLoading(state, action) {
      state.detailsLoading = Boolean(action.payload);
    },
    setTripDetails(state, action) {
      state.selectedTripBookings = Array.isArray(action.payload?.associatedBookings)
        ? action.payload.associatedBookings
        : [];
      state.reassignmentHistory = Array.isArray(action.payload?.reassignmentHistory)
        ? action.payload.reassignmentHistory
        : [];
    },
    clearTripDetails(state) {
      state.selectedTripBookings = [];
      state.reassignmentHistory = [];
      state.detailsLoading = false;
    },
    setReassigningTripId(state, action) {
      state.reassigningTripId = action.payload ?? null;
    },
    clearReassigningTrip(state) {
      state.reassigningTripId = null;
    },
    setSearch(state, action) {
      state.search = action.payload ?? '';
    },
    setStatusFilter(state, action) {
      state.statusFilter = action.payload ?? '';
    },
    resetAdminTrips() {
      return initialState;
    },
  },
});

export const adminTripsActions = adminTripsSlice.actions;
export default adminTripsSlice;
