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
  detailsByTripId: {},
  reassigningTripId: null,
  search: '',
  statusFilter: '',
  loaded: false,
  stale: false,
  lastFetchedAt: null,
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
      state.loaded = true;
      state.stale = false;
      state.lastFetchedAt = Date.now();
    },
    markStale(state) {
      state.stale = true;
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
      state.detailsLoading = false;
    },
    setDetailsLoading(state, action) {
      const payload = action.payload;
      if (payload && typeof payload === 'object') {
        const { tripId, loading } = payload;
        state.detailsLoading = Boolean(loading);
        if (tripId != null) {
          const prev = state.detailsByTripId[tripId] || { reassignmentHistory: [] };
          state.detailsByTripId[tripId] = {
            ...prev,
            loading: Boolean(loading),
            error: loading ? null : prev.error ?? null,
          };
        }
      } else {
        state.detailsLoading = Boolean(payload);
      }
    },
    setTripDetailsError(state, action) {
      const { tripId, error } = action.payload || {};
      state.detailsLoading = false;
      if (tripId != null) {
        const prev = state.detailsByTripId[tripId] || { reassignmentHistory: [] };
        state.detailsByTripId[tripId] = {
          ...prev,
          loading: false,
          error: error ?? null,
        };
      }
    },
    setTripDetails(state, action) {
      const { tripId, associatedBookings, reassignmentHistory } = action.payload || {};
      const history = Array.isArray(reassignmentHistory) ? reassignmentHistory : [];
      if (tripId != null) {
        state.detailsByTripId[tripId] = {
          reassignmentHistory: history,
          loaded: true,
          loading: false,
          error: null,
          stale: false,
          lastFetchedAt: Date.now(),
        };
      }
      if (tripId == null || state.selectedTripId === tripId) {
        state.selectedTripBookings = Array.isArray(associatedBookings) ? associatedBookings : [];
        state.reassignmentHistory = history;
      }
    },
    invalidateTripDetails(state, action) {
      const tripId = action.payload;
      if (tripId != null && state.detailsByTripId[tripId]) {
        state.detailsByTripId[tripId].stale = true;
      }
    },
    clearTripDetails(state) {
      // Only clear transient UI loading state; preserve cached detailsByTripId.
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
