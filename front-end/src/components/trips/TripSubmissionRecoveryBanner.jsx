import React from 'react';
import StatusBadge from '../common/StatusBadge';

/**
 * TripSubmissionRecoveryBanner: Notifies travelers of an in-progress or recoverable trip submission.
 * 
 * Props:
 * - submissionProgress: Tracks saved trip ID, destination, status, and booking completion flags
 * - isSubmitting: Boolean indicating whether an active retry request is running
 * - onRetry: Callback to resume booking submission for uncompleted items
 * - onDiscard: Callback to discard the pending session progress
 */
export default function TripSubmissionRecoveryBanner({
  submissionProgress,
  isSubmitting = false,
  onRetry,
  onDiscard,
}) {
  if (!submissionProgress?.tripId) return null;

  return (
    <div
      style={{
        padding: '16px 20px',
        background: '#f0f9ff',
        border: '1.5px solid #bae6fd',
        borderRadius: '14px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🔄</span>
          <div>
            <strong style={{ color: '#0369a1', fontSize: '14px' }}>
              Trip Submission Recovery Available: Trip #{submissionProgress.tripId}
            </strong>
            <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '2px' }}>
              Destination: <strong>{submissionProgress.destination}</strong> • Saved Status:{' '}
              <StatusBadge status={submissionProgress.tripStatus || 'Pending'} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onRetry}
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ padding: '7px 18px', fontSize: '12px', fontWeight: 700 }}
          >
            {isSubmitting ? 'Retrying...' : 'Retry Missing Bookings ↺'}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="btn btn-secondary"
            style={{ padding: '7px 14px', fontSize: '12px' }}
          >
            Discard Recovery
          </button>
        </div>
      </div>

      <div
        style={{
          fontSize: '12px',
          color: '#334155',
          background: '#ffffff',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <strong>Step Progress:</strong>
        <div style={{ display: 'flex', gap: '16px', marginTop: '4px', flexWrap: 'wrap' }}>
          <span>
            • Trip: <strong style={{ color: '#047857' }}>✓ Saved (#{submissionProgress.tripId})</strong>
          </span>
          <span>
            • Transport:{' '}
            {submissionProgress.transportBooking?.completed ? (
              <strong style={{ color: '#047857' }}>✓ Booked (#{submissionProgress.transportBooking.bookingId})</strong>
            ) : submissionProgress.transportBooking?.error ? (
              <strong style={{ color: '#dc2626' }}>⚠️ Failed ({submissionProgress.transportBooking.error})</strong>
            ) : (
              <strong style={{ color: '#d97706' }}>Pending</strong>
            )}
          </span>
          <span>
            • Accommodation:{' '}
            {submissionProgress.hotelBooking?.completed ? (
              <strong style={{ color: '#047857' }}>✓ Booked (#{submissionProgress.hotelBooking.bookingId})</strong>
            ) : submissionProgress.hotelBooking?.error ? (
              <strong style={{ color: '#dc2626' }}>⚠️ Failed ({submissionProgress.hotelBooking.error})</strong>
            ) : (
              <strong style={{ color: '#d97706' }}>Pending</strong>
            )}
          </span>
          {submissionProgress.guideNotification?.error && (
            <span>
              • Guide Message: <strong style={{ color: '#ea580c' }}>⚠️ Delivery issue</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
