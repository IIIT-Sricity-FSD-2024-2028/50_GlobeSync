// Admin guides slice: stores certified tour guides, verification states, and modal dialogs.
// Pure synchronous Immer reducers; async requests live in admin-guides-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  guides: [],
  relatedPackages: [],
  selectedGuideId: null,
  verifyingGuideId: null,
  search: '',
  deactivationReason: '',
  verificationForm: {
    proofUrl: '',
    expYears: '',
    rateMinor: '',
  },
  modal: {
    formOpen: false,
    verifyOpen: false,
    deactivateOpen: false,
    viewOpen: false,
  },
  loaded: false,
  stale: false,
  lastFetchedAt: null,
  loading: false,
  error: null,
};

const adminGuidesSlice = createSlice({
  name: 'adminGuides',
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
    setGuidesData(state, action) {
      state.guides = Array.isArray(action.payload?.guides) ? action.payload.guides : [];
      state.relatedPackages = Array.isArray(action.payload?.packages) ? action.payload.packages : [];
      state.loaded = true;
      state.stale = false;
      state.lastFetchedAt = Date.now();
    },
    markStale(state) {
      state.stale = true;
    },
    addGuide(state, action) {
      if (action.payload) {
        state.guides.unshift(action.payload);
      }
    },
    updateGuide(state, action) {
      const updated = action.payload;
      const targetId = updated?.guideId || updated?.id;
      const idx = state.guides.findIndex((g) => (g.guideId || g.id) === targetId);
      if (idx >= 0) {
        state.guides[idx] = { ...state.guides[idx], ...updated };
      }
    },
    setSelectedGuideId(state, action) {
      state.selectedGuideId = action.payload ?? null;
    },
    setVerifyingGuideId(state, action) {
      state.verifyingGuideId = action.payload ?? null;
    },
    setSearch(state, action) {
      state.search = action.payload ?? '';
    },
    setDeactivationReason(state, action) {
      state.deactivationReason = action.payload ?? '';
    },
    setVerificationForm(state, action) {
      state.verificationForm = { ...state.verificationForm, ...action.payload };
    },
    openFormModal(state, action) {
      state.selectedGuideId = action.payload ?? null;
      state.modal.formOpen = true;
      state.error = null;
    },
    closeFormModal(state) {
      state.modal.formOpen = false;
      state.selectedGuideId = null;
      state.error = null;
    },
    openVerifyModal(state, action) {
      state.verifyingGuideId = action.payload ?? null;
      state.modal.verifyOpen = true;
      state.verificationForm = { proofUrl: '', expYears: '', rateMinor: '' };
      state.error = null;
    },
    closeVerifyModal(state) {
      state.modal.verifyOpen = false;
      state.verifyingGuideId = null;
      state.error = null;
    },
    openDeactivateModal(state, action) {
      state.selectedGuideId = action.payload ?? null;
      state.modal.deactivateOpen = true;
      state.deactivationReason = '';
      state.error = null;
    },
    closeDeactivateModal(state) {
      state.modal.deactivateOpen = false;
      state.selectedGuideId = null;
      state.deactivationReason = '';
      state.error = null;
    },
    openViewModal(state, action) {
      state.selectedGuideId = action.payload ?? null;
      state.modal.viewOpen = true;
    },
    closeViewModal(state) {
      state.modal.viewOpen = false;
      state.selectedGuideId = null;
    },
    resetAdminGuides() {
      return initialState;
    },
  },
});

export const adminGuidesActions = adminGuidesSlice.actions;
export default adminGuidesSlice;
