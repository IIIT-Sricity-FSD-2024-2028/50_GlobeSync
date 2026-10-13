import React, { useState } from 'react';
import { reviewsApi, tripsApi, travelersApi, guidesApi } from '../../services/api';
import { AdminPage, AdminTable, Filters, DeleteDialog, matches, useAdminData } from '../../components/admin/AdminUI';

const load = async options => {
  const [reviews, trips, travelers, guides] = await Promise.all([
    reviewsApi.getAll(options), tripsApi.getAll(options), travelersApi.getAll(options), guidesApi.getAll(options),
  ]);
  return { reviews, trips, travelers, guides };
};
export default function AdminReviewsPage() {
  const resource = useAdminData(load);
  const [query, setQuery] = useState('');
  const [rating, setRating] = useState('');
  const [deleting, setDeleting] = useState(null);
  const d = resource.data;
  const trip = row => d?.trips.find(t => t.tripId === row.tripId)?.destination || `Trip #${row.tripId}`;
  const traveler = row => d?.travelers.find(t => t.travelerId === row.travelerId)?.name || `Traveler #${row.travelerId}`;
  const guide = row => row.guideId == null ? '-' : d?.guides.find(g => g.guideId === row.guideId)?.name || `Guide #${row.guideId}`;
  const rows = d?.reviews.filter(r => (!rating || r.tripRating === Number(rating)) &&
    matches([r.reviewId, r.comment, trip(r), traveler(r), guide(r)], query)) || [];
  return <AdminPage title="Reviews" resource={resource}>
    {d && <><Filters {...{ query, setQuery }} extra={<label>Trip rating<select value={rating} onChange={e => setRating(e.target.value)}><option value="">All ratings</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label>} />
      <AdminTable rowKey="reviewId" rows={rows} columns={[
        { label: 'ID', key: 'reviewId' }, { label: 'Trip', render: trip },
        { label: 'Traveler', render: traveler }, { label: 'Guide', render: guide },
        { label: 'Trip rating', render: r => `${r.tripRating} / 5` },
        { label: 'Guide rating', render: r => `${r.guideRating} / 5` },
        { label: 'Comment', key: 'comment' }, { label: 'Date', key: 'createdAt' },
        { label: 'Moderation', render: r => <button className="btn btn-danger btn-sm" onClick={() => setDeleting(r)}>Delete review</button> },
      ]} /></>}
    {deleting && <DeleteDialog title={`Delete review #${deleting.reviewId}?`} warning="This permanently removes the review from the shared review data seen by travelers and guides. This cannot be undone." busy={resource.busy} error={resource.error} onClose={() => setDeleting(null)}
      onConfirm={() => resource.run(() => reviewsApi.delete(deleting.reviewId), 'Review removed.', () => setDeleting(null))} />}
  </AdminPage>;
}
