// Admin agencies slice: stores travel agency partners, status review, and deactivation states.
// Pure synchronous Immer reducers; async requests live in admin-agencies-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  agencies: [],
  loaded: false,
  stale: false,
  lastFetchedAt: null,
  selectedAgencyId: null,
  detailedAgency: null,
  detailsByAgencyId: {},
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
      state.loaded = true;
      state.stale = false;
      state.lastFetchedAt = Date.now();
    },
    markStale(state) {
      state.stale = true;
    },
    addAgency(state, action) {
      if (action.payload) {
        state.agencies.unshift(action.payload);
        const id = action.payload.agencyId || action.payload.id;
        if (id != null) {
          state.detailsByAgencyId[id] = {
            data: action.payload,
            loaded: true,
            loading: false,
            error: null,
            stale: false,
            lastFetchedAt: Date.now(),
          };
        }
      }
    },
    updateAgency(state, action) {
      const updated = action.payload;
      const targetId = updated?.agencyId || updated?.id;
      const idx = state.agencies.findIndex((a) => (a.agencyId || a.id) === targetId);
      if (idx >= 0) {
        state.agencies[idx] = { ...state.agencies[idx], ...updated };
      }
      if (targetId != null && state.detailsByAgencyId[targetId]?.data) {
        state.detailsByAgencyId[targetId].data = {
          ...state.detailsByAgencyId[targetId].data,
          ...updated,
        };
        state.detailsByAgencyId[targetId].lastFetchedAt = Date.now();
      }
      if (state.detailedAgency && (state.detailedAgency.agencyId || state.detailedAgency.id) === targetId) {
        state.detailedAgency = { ...state.detailedAgency, ...updated };
      }
    },
    setAgencyDetailsLoading(state, action) {
      const { agencyId, loading } = action.payload || {};
      if (agencyId == null) return;
      const prev = state.detailsByAgencyId[agencyId] || {};
      state.detailsByAgencyId[agencyId] = {
        ...prev,
        loading: Boolean(loading),
        error: loading ? null : prev.error ?? null,
      };
    },
    setAgencyDetailsError(state, action) {
      const { agencyId, error } = action.payload || {};
      if (agencyId == null) return;
      const prev = state.detailsByAgencyId[agencyId] || {};
      state.detailsByAgencyId[agencyId] = {
        ...prev,
        loading: false,
        error: error ?? null,
      };
    },
    setDetailedAgency(state, action) {
      const data = action.payload ?? null;
      state.detailedAgency = data;
      const id = data?.agencyId || data?.id;
      if (id != null) {
        state.detailsByAgencyId[id] = {
          data,
          loaded: true,
          loading: false,
          error: null,
          stale: false,
          lastFetchedAt: Date.now(),
        };
      }
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
