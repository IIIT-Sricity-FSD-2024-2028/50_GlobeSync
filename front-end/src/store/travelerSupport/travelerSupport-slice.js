// Traveler support slice: stores support tickets submitted by the authenticated traveler.
// Pure synchronous Immer reducers; async requests live in travelerSupport-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tickets: [],
  loading: false,
  error: null,
};

const travelerSupportSlice = createSlice({
  name: 'travelerSupport',
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
    setTickets(state, action) {
      state.tickets = Array.isArray(action.payload) ? action.payload : [];
    },
    addTicket(state, action) {
      if (action.payload) state.tickets.unshift(action.payload);
    },
    updateTicket(state, action) {
      const updated = action.payload;
      const targetId = updated?.ticketId || updated?.id;
      const idx = state.tickets.findIndex((t) => (t.ticketId || t.id) === targetId);
      if (idx >= 0) state.tickets[idx] = { ...state.tickets[idx], ...updated };
    },
    resetTravelerSupport() {
      return initialState;
    },
  },
});

export const travelerSupportActions = travelerSupportSlice.actions;
export default travelerSupportSlice;
