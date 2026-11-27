// Traveler trips slice: stores trips, daily itineraries, guides, and reassignment requests.
// Pure synchronous Immer reducers; async requests live in travelerTrips-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  trips: [],
  selectedTripId: null,
  itineraries: [],
  itinerariesLoading: false,
  itinerariesError: null,
  guides: [],
  guidesWarning: null,
  pendingReassignments: [],
  resumeTrip: null,
  loading: false,
  error: null,
};

const travelerTripsSlice = createSlice({
  name: 'travelerTrips',
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
      state.itinerariesError = null;
    },
    setItinerariesLoading(state, action) {
      state.itinerariesLoading = Boolean(action.payload);
    },
    setItinerariesError(state, action) {
      state.itinerariesError = action.payload ?? null;
    },
    setGuidesWarning(state, action) {
      state.guidesWarning = action.payload ?? null;
    },
    setSelectedTripId(state, action) {
      state.selectedTripId = action.payload ?? null;
    },
    setTrips(state, action) {
      state.trips = Array.isArray(action.payload) ? action.payload : [];
    },
    setItineraries(state, action) {
      state.itineraries = Array.isArray(action.payload) ? action.payload : [];
    },
    setGuides(state, action) {
      state.guides = Array.isArray(action.payload) ? action.payload : [];
    },
    setPendingReassignments(state, action) {
      state.pendingReassignments = Array.isArray(action.payload) ? action.payload : [];
    },
    setResumeTrip(state, action) {
      state.resumeTrip = action.payload ?? null;
    },
    addTrip(state, action) {
      if (action.payload) state.trips.unshift(action.payload);
    },
    updateTrip(state, action) {
      const updated = action.payload;
      const targetId = updated?.tripId || updated?.id;
      const idx = state.trips.findIndex((t) => (t.tripId || t.id) === targetId);
      if (idx >= 0) state.trips[idx] = { ...state.trips[idx], ...updated };
    },
    addItinerary(state, action) {
      if (action.payload) state.itineraries.push(action.payload);
    },
    updateItinerary(state, action) {
      const updated = action.payload;
      const targetId = updated?.itineraryId || updated?.id;
      const idx = state.itineraries.findIndex((i) => (i.itineraryId || i.id) === targetId);
      if (idx >= 0) state.itineraries[idx] = { ...state.itineraries[idx], ...updated };
    },
    removeItinerary(state, action) {
      state.itineraries = state.itineraries.filter((i) => (i.itineraryId || i.id) !== action.payload);
    },
    removePendingReassignment(state, action) {
      state.pendingReassignments = state.pendingReassignments.filter((r) => r.id !== action.payload);
    },
    resetTravelerTrips() {
      return initialState;
    },
  },
});

export const travelerTripsActions = travelerTripsSlice.actions;
export default travelerTripsSlice;
