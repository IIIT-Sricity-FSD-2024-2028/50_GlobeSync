// Admin reviews slice: stores reviews and handles optimistic removal on moderation.
// Pure synchronous Immer reducers; async requests live in admin-reviews-actions.js.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  reviews: [],
  relatedTrips: [],
  relatedGuides: [],
  deletingReviewId: null,
  search: '',
  ratingFilter: 'all',
  loaded: false,
  stale: false,
  lastFetchedAt: null,
  loading: false,
  error: null,
};

const adminReviewsSlice = createSlice({
  name: 'adminReviews',
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
    setReviewsData(state, action) {
      state.reviews = Array.isArray(action.payload?.reviews) ? action.payload.reviews : [];
      state.relatedTrips = Array.isArray(action.payload?.trips) ? action.payload.trips : [];
      state.relatedGuides = Array.isArray(action.payload?.guides) ? action.payload.guides : [];
      state.loaded = true;
      state.stale = false;
      state.lastFetchedAt = Date.now();
    },
    markStale(state) {
      state.stale = true;
    },
    removeReview(state, action) {
      const targetId = action.payload;
      state.reviews = state.reviews.filter((r) => r.reviewId !== targetId);
      state.deletingReviewId = null;
    },
    setDeletingReviewId(state, action) {
      state.deletingReviewId = action.payload ?? null;
    },
    clearDeletingReview(state) {
      state.deletingReviewId = null;
    },
    setSearch(state, action) {
      state.search = action.payload ?? '';
    },
    setRatingFilter(state, action) {
      state.ratingFilter = action.payload ?? 'all';
    },
    resetAdminReviews() {
      return initialState;
    },
  },
});

export const adminReviewsActions = adminReviewsSlice.actions;
export default adminReviewsSlice;
