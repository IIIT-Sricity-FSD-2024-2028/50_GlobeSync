import React from 'react';
import GuideRequestCard from './GuideRequestCard';

/**
 * GuideRequestList Component
 * Renders list of trip requests or empty state.
 */
export default function GuideRequestList({
  requests = [],
  actionLoading = {},
  notificationErrors = {},
  onAccept,
  onDecline,
  onRetryNotification,
}) {
  if (requests.length === 0) {
    return (
      <div className="card guide-empty-card">
        <div style={{ fontSize: '54px', marginBottom: '16px' }}>📭</div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
          No Trip Requests Found
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '440px', margin: '0 auto' }}>
          No incoming requests match your active search query or filter tab. New traveler or agency requests will appear here when assigned to you.
        </p>
      </div>
    );
  }

  return (
    <div className="guide-requests-list-container">
      {requests.map((trip) => (
        <GuideRequestCard
          key={trip.tripId}
          trip={trip}
          actionState={actionLoading[trip.tripId] || null}
          notificationError={notificationErrors[trip.tripId] || null}
          onAccept={onAccept}
          onDecline={onDecline}
          onRetryNotification={onRetryNotification}
        />
      ))}
    </div>
  );
}
