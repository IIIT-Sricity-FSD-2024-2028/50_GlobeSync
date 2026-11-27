import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  role: null,
  travelerId: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSession(state, action) {
      const { user = null, role = null, travelerId = null } = action.payload || {};
      state.user = user;
      state.role = role;
      state.travelerId = travelerId;
      state.isAuthenticated = true;
    },
    clearAuthSession(state) {
      state.user = null;
      state.role = null;
      state.travelerId = null;
      state.isAuthenticated = false;
    },
  },
});

export const authActions = authSlice.actions;
export default authSlice;
