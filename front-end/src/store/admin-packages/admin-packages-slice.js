// Admin packages slice: stores tour package catalog, filtering, and modal states.
// Pure synchronous Immer reducers; async requests live in admin-packages-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  packages: [],
  selectedPackageId: null,
  search: '',
  statusFilter: 'all',
  modal: {
    createOpen: false,
    editOpen: false,
    archiveOpen: false,
  },
  archiveReason: '',
  loading: false,
  error: null,
};

const adminPackagesSlice = createSlice({
  name: 'adminPackages',
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
    setPackages(state, action) {
      state.packages = Array.isArray(action.payload) ? action.payload : [];
    },
    addPackage(state, action) {
      if (action.payload) {
        state.packages.unshift(action.payload);
      }
    },
    updatePackage(state, action) {
      const updated = action.payload;
      const targetId = updated?.packageId || updated?.id;
      const idx = state.packages.findIndex((p) => (p.packageId || p.id) === targetId);
      if (idx >= 0) {
        state.packages[idx] = { ...state.packages[idx], ...updated };
      }
    },
    archivePackage(state, action) {
      const targetId = action.payload?.packageId || action.payload;
      const idx = state.packages.findIndex((p) => (p.packageId || p.id) === targetId);
      if (idx >= 0) {
        state.packages[idx] = { ...state.packages[idx], status: 'archived', ...(action.payload || {}) };
      }
    },
    setSelectedPackageId(state, action) {
      state.selectedPackageId = action.payload ?? null;
    },
    setSearch(state, action) {
      state.search = action.payload ?? '';
    },
    setStatusFilter(state, action) {
      state.statusFilter = action.payload ?? 'all';
    },
    setArchiveReason(state, action) {
      state.archiveReason = action.payload ?? '';
    },
    openCreateModal(state) {
      state.selectedPackageId = null;
      state.modal.createOpen = true;
      state.modal.editOpen = false;
      state.modal.archiveOpen = false;
      state.error = null;
    },
    openEditModal(state, action) {
      state.selectedPackageId = action.payload;
      state.modal.createOpen = false;
      state.modal.editOpen = true;
      state.modal.archiveOpen = false;
      state.error = null;
    },
    openArchiveModal(state, action) {
      state.selectedPackageId = action.payload;
      state.modal.createOpen = false;
      state.modal.editOpen = false;
      state.modal.archiveOpen = true;
      state.archiveReason = '';
      state.error = null;
    },
    closeModal(state) {
      state.selectedPackageId = null;
      state.modal.createOpen = false;
      state.modal.editOpen = false;
      state.modal.archiveOpen = false;
      state.archiveReason = '';
      state.error = null;
    },
    resetAdminPackages() {
      return initialState;
    },
  },
});

export const adminPackagesActions = adminPackagesSlice.actions;
export default adminPackagesSlice;
