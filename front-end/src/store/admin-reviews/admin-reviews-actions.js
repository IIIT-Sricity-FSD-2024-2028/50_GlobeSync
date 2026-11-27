// Thunks: fetchAdminReviews, deleteAdminReview
// Isolated asynchronous operations following Prof. Mallikarjun Reddy Sir's pattern.
import { reviewsApi, tripsApi, guidesApi } from '../../services/api';
import { adminReviewsActions } from './admin-reviews-slice';

export const fetchAdminReviews = () => {
  return async (dispatch) => {
    dispatch(adminReviewsActions.setLoading(true));
    dispatch(adminReviewsActions.setError(null));
    try {
      const [reviewsRes, tripsRes, guidesRes] = await Promise.allSettled([
        reviewsApi.getAll(),
        tripsApi.getAll(),
        guidesApi.getAll(),
      ]);

      const reviews =
        reviewsRes.status === 'fulfilled'
          ? Array.isArray(reviewsRes.value?.data)
            ? reviewsRes.value.data
            : Array.isArray(reviewsRes.value)
            ? reviewsRes.value
            : []
          : [];

      const trips =
        tripsRes.status === 'fulfilled'
          ? Array.isArray(tripsRes.value?.data)
            ? tripsRes.value.data
            : Array.isArray(tripsRes.value)
            ? tripsRes.value
            : []
          : [];

      const guides =
        guidesRes.status === 'fulfilled'
          ? Array.isArray(guidesRes.value?.data)
            ? guidesRes.value.data
            : Array.isArray(guidesRes.value)
            ? guidesRes.value
            : []
          : [];

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
  };
};

export const deleteAdminReview = (reviewId) => {
  return async (dispatch) => {
    dispatch(adminReviewsActions.setLoading(true));
    dispatch(adminReviewsActions.setError(null));
    try {
      await reviewsApi.delete(reviewId);
      dispatch(adminReviewsActions.removeReview(reviewId));
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
