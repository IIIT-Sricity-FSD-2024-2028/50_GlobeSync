// Thunks: fetchAdminReviews, deleteAdminReview
// Cache-aware manual thunks reusing canonical adminTrips & adminGuides caches.
import { reviewsApi } from '../../services/api';
import { adminReviewsActions } from './admin-reviews-slice';
import { fetchAdminTrips } from '../admin-trips/admin-trips-actions';
import { fetchAdminGuides } from '../admin-guides/admin-guides-actions';
import { adminReportsActions } from '../admin-reports/admin-reports-slice';
import { runDeduplicated } from '../admin-ui/admin-cache-utils';

export const fetchAdminReviews = ({ force = false } = {}) => {
  return async (dispatch, getState) => {
    const state = getState().adminReviews;
    if (state?.loaded && !state.stale && !force) {
      return {
        reviews: state.reviews,
        trips: getState().adminTrips?.trips || state.relatedTrips,
        guides: getState().adminGuides?.guides || state.relatedGuides,
      };
    }

    return runDeduplicated('adminReviews:fetch', async () => {
      const latest = getState().adminReviews;
      if (latest?.loaded && !latest.stale && !force) {
        return {
          reviews: latest.reviews,
          trips: getState().adminTrips?.trips || latest.relatedTrips,
          guides: getState().adminGuides?.guides || latest.relatedGuides,
        };
      }

      dispatch(adminReviewsActions.setLoading(true));
      dispatch(adminReviewsActions.setError(null));
      try {
        const [reviewsRes, tripsResult, guidesResult] = await Promise.allSettled([
          reviewsApi.getAll(),
          dispatch(fetchAdminTrips({ force })),
          dispatch(fetchAdminGuides({ force })),
        ]);

        if (reviewsRes.status === 'rejected') {
          throw reviewsRes.reason || new Error('Failed to load reviews.');
        }

        const reviews = Array.isArray(reviewsRes.value?.data)
          ? reviewsRes.value.data
          : Array.isArray(reviewsRes.value)
          ? reviewsRes.value
          : [];

        const trips =
          tripsResult.status === 'fulfilled'
            ? Array.isArray(tripsResult.value?.trips)
              ? tripsResult.value.trips
              : getState().adminTrips?.trips || []
            : getState().adminTrips?.trips || [];

        const guides =
          guidesResult.status === 'fulfilled'
            ? Array.isArray(guidesResult.value?.guides)
              ? guidesResult.value.guides
              : getState().adminGuides?.guides || []
            : getState().adminGuides?.guides || [];

        const result = { reviews, trips, guides };
        dispatch(adminReviewsActions.setReviewsData(result));
        return result;
      } catch (err) {
        const msg = err?.response?.data?.message || err.message || 'Failed to load reviews.';
        dispatch(adminReviewsActions.setError(msg));
        throw err;
      } finally {
        dispatch(adminReviewsActions.setLoading(false));
      }
    });
  };
};

export const deleteAdminReview = (reviewId) => {
  return async (dispatch) => {
    dispatch(adminReviewsActions.setLoading(true));
    dispatch(adminReviewsActions.setError(null));
    try {
      await reviewsApi.delete(reviewId);
      dispatch(adminReviewsActions.removeReview(reviewId));
      dispatch(adminReportsActions.markStale());
      return reviewId;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete review.';
      dispatch(adminReviewsActions.setError(msg));
      throw err;
    } finally {
      dispatch(adminReviewsActions.setLoading(false));
    }
  };
};
