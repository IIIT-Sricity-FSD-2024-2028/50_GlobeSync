// Admin agencies slice: stores travel agency partners, status review, and deactivation states.
// Pure synchronous Immer reducers; async requests live in admin-agencies-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  agencies: [],
  selectedAgencyId: null,
  detailedAgency: null,
  search: '',
  statusFilter: '',
  deactivationReason: '',
  modal: {
    formOpen: false,
    statusOpen: false,
    detailsOpen: false,
    deactivateOpen: false,
  },
  loading: false,
  error: null,
};

const adminAgenciesSlice = createSlice({
  name: 'adminAgencies',
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
    setAgencies(state, action) {
      state.agencies = Array.isArray(action.payload) ? action.payload : [];
    },
    addAgency(state, action) {
      if (action.payload) {
        state.agencies.unshift(action.payload);
      }
    },
    updateAgency(state, action) {
      const updated = action.payload;
      const targetId = updated?.agencyId || updated?.id;
      const idx = state.agencies.findIndex((a) => (a.agencyId || a.id) === targetId);
      if (idx >= 0) {
        state.agencies[idx] = { ...state.agencies[idx], ...updated };
      }
    },
    setDetailedAgency(state, action) {
      state.detailedAgency = action.payload ?? null;
      state.modal.detailsOpen = Boolean(action.payload);
    },
    setSelectedAgencyId(state, action) {
      state.selectedAgencyId = action.payload ?? null;
    },
    setSearch(state, action) {
      state.search = action.payload ?? '';
    },
    setStatusFilter(state, action) {
      state.statusFilter = action.payload ?? '';
    },
    setDeactivationReason(state, action) {
      state.deactivationReason = action.payload ?? '';
    },
    openFormModal(state, action) {
      state.selectedAgencyId = action.payload ?? null;
      state.modal.formOpen = true;
      state.error = null;
    },
    closeFormModal(state) {
      state.modal.formOpen = false;
      state.selectedAgencyId = null;
      state.error = null;
    },
    openStatusModal(state, action) {
      state.selectedAgencyId = action.payload ?? null;
      state.modal.statusOpen = true;
      state.error = null;
    },
    closeStatusModal(state) {
      state.modal.statusOpen = false;
      state.selectedAgencyId = null;
      state.error = null;
    },
    openDetailsModal(state, action) {
      state.selectedAgencyId = action.payload ?? null;
      state.modal.detailsOpen = true;
    },
    closeDetailsModal(state) {
      state.modal.detailsOpen = false;
      state.detailedAgency = null;
      state.selectedAgencyId = null;
    },
    openDeactivateModal(state, action) {
      state.selectedAgencyId = action.payload ?? null;
      state.modal.deactivateOpen = true;
      state.deactivationReason = '';
      state.error = null;
    },
    closeDeactivateModal(state) {
      state.modal.deactivateOpen = false;
      state.selectedAgencyId = null;
      state.deactivationReason = '';
      state.error = null;
    },
    resetAdminAgencies() {
      return initialState;
    },
  },
});

export const adminAgenciesActions = adminAgenciesSlice.actions;
export default adminAgenciesSlice;
