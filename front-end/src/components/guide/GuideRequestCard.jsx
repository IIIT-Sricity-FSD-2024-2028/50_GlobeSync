import React from 'react';

/**
 * GuideRequestCard Component
 * Displays a single trip request for the guide.
 * Features:
 * - Handles both traveler-owned and agency-owned trips
 * - Displays destination, requestor name, dates, budget, and codes
 * - Clear action buttons for Accept and Decline with submitting state to prevent repeated clicks
 * - Decoupled notification failure display with isolated 'Retry Notification' action
 */
export default function GuideRequestCard({
  trip,
  actionState = null,
  notificationError = null,
  onAccept,
  onDecline,
  onRetryNotification,
}) {
  const isAccepting = actionState === 'accepting';
  const isDeclining = actionState === 'declining';
  const isNotifying = actionState === 'notifying';
  const isSubmitting = isAccepting || isDeclining || isNotifying;

  const isAccepted = trip.guideStatus === 'Accepted' || (trip.status === 'Confirmed' && trip.guideStatus !== 'Declined');
  const isDeclined = trip.guideStatus === 'Declined' || trip.guideId === null;

  const requestorName = trip.requestorName || 'Unknown Requestor';
  const isAgency = Boolean(trip.agencyId);
  const badgeText = isAgency ? '🏢 Agency Request' : '🎒 Traveler Request';
  const codeTag = isAgency
    ? `#AGY-${String(trip.agencyId || 0).padStart(4, '0')}`
    : `#TRV-${String(trip.travelerId || 0).padStart(4, '0')}`;

  const initial = requestorName.charAt(0).toUpperCase() || '?';

  return (
    <div className={`guide-request-card ${isAccepted ? 'accepted-card' : ''}`}>
      {/* Requestor Avatar */}
      <div className={`guide-req-avatar ${isAgency ? 'agency-avatar' : ''}`}>
        {initial}
      </div>

      {/* Main Request Information */}
      <div className="guide-req-info">
        <div className="guide-req-header">
          <div>
            <div className="guide-req-destination">
              <span>📍</span> {trip.destination}
            </div>
            <div className="guide-req-requestor">
              Requested by <strong>{requestorName}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`guide-tag-badge ${isAgency ? 'agency-badge' : 'traveler-badge'}`}>
              {badgeText}
            </span>
            <span className="guide-tag-badge trip-id-badge">
              Trip #{trip.tripId}
            </span>
          </div>
        </div>

        {/* Details Grid: Dates, Budget, Code, Status */}
        <div className="guide-req-details-grid">
          <div className="guide-req-detail-item">
            <span className="guide-req-detail-label">Travel Dates</span>
            <span className="guide-req-detail-value">
              📅 {trip.startDate} to {trip.endDate}
            </span>
          </div>

          <div className="guide-req-detail-item">
            <span className="guide-req-detail-label">Estimated Budget</span>
            <span className="guide-req-detail-value guide-budget-value">
              💰 ₹{Number(trip.budget || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="guide-req-detail-item">
            <span className="guide-req-detail-label">Account Code</span>
            <span className="guide-req-detail-value">
              {codeTag}
            </span>
          </div>

          <div className="guide-req-detail-item">
            <span className="guide-req-detail-label">Trip Status</span>
            <span className="guide-req-detail-value">
              <span className={`guide-status-pill status-${(trip.status || 'pending').toLowerCase()}`}>
                {trip.status}
              </span>
            </span>
          </div>
        </div>

        {/* Decoupled Notification Failure Warning Banner */}
        {notificationError && (
          <div className="guide-notification-error-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <div>
                <strong>Decision Saved:</strong> {notificationError.message || 'Notification could not be delivered to requestor.'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRetryNotification(trip.tripId)}
              disabled={isSubmitting}
              className="btn btn-secondary guide-retry-notif-btn"
            >
              {isNotifying ? 'Sending...' : '🔄 Retry Notification'}
            </button>
          </div>
        )}
      </div>

      {/* Action Decision Buttons */}
      <div className="guide-req-actions">
        {isAccepted ? (
          <div className="guide-accepted-pill">
            <span>✓</span> Accepted by You
          </div>
        ) : isDeclined ? (
          <div className="guide-declined-pill">
            <span>✕</span> Declined
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onAccept(trip)}
              disabled={isSubmitting}
              className="btn guide-btn-accept"
              title="Accept trip request and notify traveler"
            >
              {isAccepting ? 'Accepting...' : '✓ Accept Trip'}
            </button>
            <button
              type="button"
              onClick={() => onDecline(trip)}
              disabled={isSubmitting}
              className="btn guide-btn-decline"
              title="Decline trip request and remove assignment"
            >
              {isDeclining ? 'Declining...' : '✕ Decline'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
