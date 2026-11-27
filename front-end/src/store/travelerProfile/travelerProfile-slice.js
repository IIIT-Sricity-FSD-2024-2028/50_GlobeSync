// Traveler profile slice: stores authenticated traveler profile and saved co-travelers.
// Pure synchronous Immer reducers; async requests live in travelerProfile-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  passengers: [],
  loading: false,
  error: null,
  passengersWarning: null,
};

const travelerProfileSlice = createSlice({
  name: 'travelerProfile',
  initialState,
  reducers: {
    setLoading(state, action) {
      state.loading = Boolean(action.payload);
    },
    setError(state, action) {
      state.error = action.payload ?? null;
    },
    setPassengersWarning(state, action) {
      state.passengersWarning = action.payload ?? null;
    },
    clearError(state) {
      state.error = null;
    },
    setProfile(state, action) {
      state.profile = action.payload ?? null;
    },
    setPassengers(state, action) {
      state.passengers = Array.isArray(action.payload) ? action.payload : [];
    },
    addPassenger(state, action) {
      if (action.payload) state.passengers.push(action.payload);
    },
    updatePassenger(state, action) {
      const updated = action.payload;
      const targetId = updated?.passId || updated?.passengerId || updated?.id;
      const idx = state.passengers.findIndex(
        (p) => (p.passId || p.passengerId || p.id) === targetId
      );
      if (idx >= 0) state.passengers[idx] = { ...state.passengers[idx], ...updated };
    },
    removePassenger(state, action) {
      const targetId = action.payload;
      state.passengers = state.passengers.filter(
        (p) => (p.passId || p.passengerId || p.id) !== targetId
      );
    },
    resetTravelerProfile() {
      return initialState;
    },
  },
});

export const travelerProfileActions = travelerProfileSlice.actions;
export default travelerProfileSlice;
