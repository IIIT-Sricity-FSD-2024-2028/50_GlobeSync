// Admin UI slice: pure synchronous state for sidebar collapse, active tabs, and alerts.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarCollapsed: false,
  activeTab: null,
  notification: null,
};

const adminUiSlice = createSlice({
  name: 'adminUi',
  initialState,
  reducers: {
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = Boolean(action.payload);
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setActiveTab(state, action) {
      state.activeTab = action.payload ?? null;
    },
    setNotification(state, action) {
      if (typeof action.payload === 'string') {
        state.notification = { type: 'info', message: action.payload };
      } else {
        state.notification = action.payload ?? null;
      }
    },
    clearNotification(state) {
      state.notification = null;
    },
    resetAdminUi() {
      return initialState;
    },
  },
});

export const adminUiActions = adminUiSlice.actions;
export default adminUiSlice;
