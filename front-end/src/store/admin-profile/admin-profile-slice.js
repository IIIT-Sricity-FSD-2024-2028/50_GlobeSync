// Admin profile slice: stores admin profile and safe form data (never passwords).
// Pure synchronous Immer reducers; async requests live in admin-profile-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  loaded: false,
  loadedAdminId: null,
  stale: false,
  lastFetchedAt: null,
  form: {
    name: '',
    email: '',
  },
  isDirty: false,
  loading: false,
  error: null,
};

const adminProfileSlice = createSlice({
  name: 'adminProfile',
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
    setProfile(state, action) {
      state.profile = action.payload ?? null;
      state.loaded = Boolean(action.payload);
      state.loadedAdminId = action.payload?.adminId ?? action.payload?.id ?? null;
      state.stale = false;
      state.lastFetchedAt = Date.now();
      state.form = {
        name: action.payload?.name ?? '',
        email: action.payload?.email ?? '',
      };
      state.isDirty = false;
    },
    markStale(state) {
      state.stale = true;
    },
    setForm(state, action) {
      state.form = { ...state.form, ...action.payload };
      state.isDirty = true;
    },
    resetForm(state) {
      if (state.profile) {
        state.form = {
          name: state.profile.name ?? '',
          email: state.profile.email ?? '',
        };
      } else {
        state.form = { name: '', email: '' };
      }
      state.isDirty = false;
    },
    resetAdminProfile() {
      return initialState;
    },
  },
});

export const adminProfileActions = adminProfileSlice.actions;
export default adminProfileSlice;
