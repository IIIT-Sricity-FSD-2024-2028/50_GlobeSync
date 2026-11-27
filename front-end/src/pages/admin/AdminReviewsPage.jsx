import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAdminReviews,
  deleteAdminReview,
} from '../../store/admin-reviews/admin-reviews-actions';
import { adminReviewsActions } from '../../store/admin-reviews/admin-reviews-slice';
import {
  AdminPage,
  AdminTable,
  Filters,
  DeleteDialog,
} from '../../components/admin/AdminUI';

export default function AdminReviewsPage() {
  const dispatch = useDispatch();

  const reviews = useSelector((state) => state.adminReviews.reviews);
  const relatedTrips = useSelector((state) => state.adminReviews.relatedTrips);
  const relatedGuides = useSelector((state) => state.adminReviews.relatedGuides);
  const deletingReviewId = useSelector((state) => state.adminReviews.deletingReviewId);
  const search = useSelector((state) => state.adminReviews.search);
  const ratingFilter = useSelector((state) => state.adminReviews.ratingFilter);
  const loading = useSelector((state) => state.adminReviews.loading);
  const error = useSelector((state) => state.adminReviews.error);

  useEffect(() => {
    dispatch(fetchAdminReviews());
  }, [dispatch]);

  const deleting = useMemo(() => {
    if (!deletingReviewId) return null;
    return reviews.find((r) => r.reviewId === deletingReviewId) || null;
  }, [reviews, deletingReviewId]);

  const trip = (row) =>
    (relatedTrips || []).find((t) => t.tripId === row.tripId)?.destination || `Trip #${row.tripId}`;

  const traveler = (row) =>
    row.travelerName || `Traveler #${row.travelerId}`;

  const guide = (row) =>
    row.guideId == null
      ? '-'
      : (relatedGuides || []).find((g) => g.guideId === row.guideId)?.name || row.guideName || `Guide #${row.guideId}`;

  const filteredReviews = useMemo(() => {
    let list = Array.isArray(reviews) ? reviews : [];
    if (ratingFilter !== 'all') {
      const r = Number(ratingFilter);
      list = list.filter((rv) => rv.tripRating === r || rv.rating === r);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((rv) =>
        (rv.comment ?? '').toLowerCase().includes(q) ||
        traveler(rv).toLowerCase().includes(q) ||
        guide(rv).toLowerCase().includes(q) ||
        trip(rv).toLowerCase().includes(q)
      );
    }
    return list;
  }, [reviews, ratingFilter, search, relatedTrips, relatedGuides]);

  const resource = {
    loading,
    busy: loading,
    load: () => dispatch(fetchAdminReviews()),
    error,
    data: reviews,
  };

  return (
    <AdminPage title="Reviews" resource={resource}>
      {reviews && (
        <>
          <Filters
            query={search}
            setQuery={(val) => dispatch(adminReviewsActions.setSearch(val))}
            extra={
              <label>
                Trip rating
                <select
                  value={ratingFilter}
                  onChange={(e) => dispatch(adminReviewsActions.setRatingFilter(e.target.value))}
                >
                  <option value="all">All ratings</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={String(n)}>
                      {n} / 5
                    </option>
                  ))}
                </select>
              </label>
            }
          />
          <AdminTable
            rowKey="reviewId"
            rows={filteredReviews}
            columns={[
              { label: 'ID', key: 'reviewId' },
              { label: 'Trip', render: trip },
              { label: 'Traveler', render: traveler },
              { label: 'Guide', render: guide },
              { label: 'Trip rating', render: (r) => `${r.tripRating ?? r.rating} / 5` },
              { label: 'Guide rating', render: (r) => `${r.guideRating ?? '-'} / 5` },
              { label: 'Comment', key: 'comment' },
              { label: 'Date', key: 'createdAt' },
              {
                label: 'Moderation',
                render: (r) => (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => dispatch(adminReviewsActions.setDeletingReviewId(r.reviewId))}
                  >
                    Delete review
                  </button>
                ),
              },
            ]}
          />
        </>
      )}
      {deleting && (
        <DeleteDialog
          title={`Delete review #${deleting.reviewId}?`}
          warning="This permanently removes the review from the shared review data seen by travelers and guides. This cannot be undone."
          busy={loading}
          error={error}
          onClose={() => dispatch(adminReviewsActions.clearDeletingReview())}
          onConfirm={async () => {
            try {
              await dispatch(deleteAdminReview(deleting.reviewId));
            } catch {
              // Error handled in Redux state
            }
          }}
        />
      )}
    </AdminPage>
  );
}
