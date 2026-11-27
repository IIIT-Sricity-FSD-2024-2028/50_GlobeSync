// Traveler messages slice: stores direct chat messages, guide roster, and active thread ID.
// Pure synchronous Immer reducers; async requests live in travelerMessages-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [],
  guides: [],
  activeConvId: null,
  loading: false,
  isSending: false,
  error: null,
  guidesWarning: null,
};

const travelerMessagesSlice = createSlice({
  name: 'travelerMessages',
  initialState,
  reducers: {
    setLoading(state, action) {
      state.loading = Boolean(action.payload);
    },
    setIsSending(state, action) {
      state.isSending = Boolean(action.payload);
    },
    setError(state, action) {
      state.error = action.payload ?? null;
    },
    setGuidesWarning(state, action) {
      state.guidesWarning = action.payload ?? null;
    },
    clearError(state) {
      state.error = null;
    },
    setActiveConvId(state, action) {
      state.activeConvId = action.payload ?? null;
    },
    setMessages(state, action) {
      state.messages = Array.isArray(action.payload) ? action.payload : [];
    },
    setGuides(state, action) {
      state.guides = Array.isArray(action.payload) ? action.payload : [];
    },
    appendMessage(state, action) {
      if (action.payload) state.messages.push(action.payload);
    },
    resetTravelerMessages() {
      return initialState;
    },
  },
});

export const travelerMessagesActions = travelerMessagesSlice.actions;
export default travelerMessagesSlice;
