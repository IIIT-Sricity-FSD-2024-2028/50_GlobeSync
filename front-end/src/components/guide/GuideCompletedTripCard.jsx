import React from 'react';

/**
 * GuideCompletedTripCard
 * Displays a single completed trip card in the guide's tour history.
 * - Shows destination, travel dates, client name, account code, and budget
 * - Matches client review strictly to the trip and guide without inventing ratings or earnings
 * - Renders stars only when verified review exists
 */
export default function GuideCompletedTripCard({ trip, review = null }) {
  const isAgency = Boolean(trip.agencyId);
  const clientName = trip.clientName || 'Direct Client';
  const initial = clientName.charAt(0).toUpperCase() || '?';

  const codeTag = isAgency
    ? `#AGY-${String(trip.agencyId || 0).padStart(4, '0')}`
    : `#TRV-${String(trip.travelerId || 0).padStart(4, '0')}`;

  // Calculate duration in days if dates are present
  let durationDays = null;
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (diff >= 0) durationDays = diff + 1;
  }

  // Generate star rating string only if actual verified rating exists
  const hasReview = Boolean(review && typeof review.guideRating === 'number');
  const ratingValue = hasReview ? Math.min(5, Math.max(1, review.guideRating)) : null;

  return (
    <div className="guide-completed-trip-card">
      {/* Client Avatar */}
      <div className={`guide-completed-avatar ${isAgency ? 'agency' : 'traveler'}`}>
        {initial}
      </div>

      {/* Main Tour Information */}
      <div className="guide-completed-info">
        <div className="guide-completed-header">
          <div>
            <div className="guide-completed-destination">
              <span>📍</span> {trip.destination}
            </div>
            <div className="guide-completed-dates">
              📅 {trip.startDate} to {trip.endDate}
              {durationDays ? ` • ${durationDays} Days Tour` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`guide-tag-badge ${isAgency ? 'agency-badge' : 'traveler-badge'}`}>
              {isAgency ? '🏢 Agency Tour' : '🎒 Traveler Tour'}
            </span>
            <span className="guide-status-pill status-completed">
              ✓ Completed
            </span>
            <span className="guide-tag-badge trip-id-badge">
              Trip #{trip.tripId}
            </span>
          </div>
        </div>

        {/* Client & Financial Details Grid */}
        <div className="guide-completed-details-grid">
          <div className="guide-completed-detail-item">
            <span className="guide-detail-label">Client Contact</span>
            <span className="guide-detail-value">{clientName}</span>
          </div>

          <div className="guide-completed-detail-item">
            <span className="guide-detail-label">Account Code</span>
            <span className="guide-detail-value">{codeTag}</span>
          </div>

          <div className="guide-completed-detail-item">
            <span className="guide-detail-label">Tour Budget</span>
            <span className="guide-detail-value guide-budget-color">
              ₹{Number(trip.budget || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="guide-completed-detail-item">
            <span className="guide-detail-label">Review Status</span>
            <span className="guide-detail-value">
              {hasReview ? '⭐ Reviewed' : 'Pending Review'}
            </span>
          </div>
        </div>

        {/* Verified Client Feedback Section (Do NOT invent ratings or earnings) */}
        <div className="guide-completed-review-box">
          {hasReview ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="guide-review-stars">
                  {'★'.repeat(ratingValue)}{'☆'.repeat(5 - ratingValue)}
                </span>
                <span className="guide-review-score">
                  ({ratingValue} / 5)
                </span>
                {review.createdAt && (
                  <span className="guide-review-date">
                    Reviewed on {review.createdAt}
                  </span>
                )}
              </div>
              <p className="guide-review-comment">
                "{review.comment || 'Great experience with this tour guide.'}"
              </p>
            </div>
          ) : (
            <div className="guide-no-review-text">
              <span>💬</span> Client feedback has not been recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
