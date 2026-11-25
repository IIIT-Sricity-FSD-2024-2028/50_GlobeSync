import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';

/**
 * TripCard: Presentation card for an individual travel itinerary
 * Supports selection, editing, and cancellation.
 * 
 * Note on Deletion:
 * Deletion is deliberately omitted because DELETE /trips/:id is strictly
 * restricted to Admin and Superuser roles by RolesGuard on the backend.
 */
export default function TripCard({
  trip,
  onEdit,
  onCancel,
  onSelect,
  isSelected = false,
}) {
  const navigate = useNavigate();
  if (!trip) return null;

  const tripId = trip.tripId || trip.id;
  const isDraft = trip.status === 'Planning';
  const guideDue = trip.guideResponseDueAt ? Date.parse(trip.guideResponseDueAt) : NaN;
  const guideExpired = trip.guideStatus === 'Pending' && !isNaN(guideDue) && Date.now() > guideDue;
  const guideLine = !trip.guideId
    ? null
    : trip.guideStatus === 'Accepted'
      ? { color: '#047857', text: `✅ Guide accepted (ID #${trip.guideId})` }
      : trip.guideStatus === 'Declined'
        ? { color: '#b91c1c', text: `❌ Guide declined. Choose another guide.` }
        : guideExpired
          ? { color: '#b45309', text: '⌛ Guide did not reply in 3 hours. Choose another guide.' }
          : trip.guideStatus === 'Pending'
            ? {
                color: '#b45309',
                text: `⏳ Waiting for guide reply${!isNaN(guideDue) ? ` (by ${new Date(guideDue).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })})` : ' (within 3 hours)'}`,
              }
            : { color: '#047857', text: `👤 Guide Assigned (ID #${trip.guideId})` };

  const canCancel = trip.status !== 'Cancelled' && trip.status !== 'Completed';

  return (
    <div
      className="card"
      style={{
        padding: '20px',
        borderRadius: '16px',
        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
        background: isSelected ? '#fffdfd' : '#fff',
        cursor: onSelect ? 'pointer' : 'default',
        boxShadow: isSelected ? '0 6px 20px rgba(232, 70, 124, 0.15)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '16px',
      }}
      onClick={() => onSelect && onSelect(trip)}
    >
      <div>
        {/* Header: Trip Number and Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Trip #{trip.tripId || trip.id}
            </span>
            <h4 style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>🛫 {trip.origin || 'New Delhi, India'}</span>
              <span style={{ color: 'var(--primary)' }}>➔</span>
              <span>🛬 {trip.destination}</span>
            </h4>
          </div>
          <StatusBadge status={trip.status || 'Pending'} />
        </div>

        {/* Schedule & Metadata */}
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
          <div>📅 {trip.startDate || 'TBD'} → {trip.endDate || 'TBD'}</div>
          {guideLine && <div style={{ color: guideLine.color, fontWeight: 600 }}>{guideLine.text}</div>}
          {isDraft && (
            <div style={{ color: '#475569', fontSize: '12px' }}>📝 Draft: nothing booked yet</div>
          )}
          {trip.packageId && (
            <div style={{ color: '#6d28d9' }}>
              📦 Pre-Planned Package #{trip.packageId}
            </div>
          )}
          {trip.status === 'Cancelled' && (
            <div
              style={{
                marginTop: '6px',
                padding: '10px 12px',
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#991b1b',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div><strong>Cancellation Reason:</strong> {trip.cancellationReason || 'Cancelled by user'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: trip.refundPercentage === 65 || trip.cancellationReason?.includes('65%') ? '#dcfce7' : '#fee2e2',
                    color: trip.refundPercentage === 65 || trip.cancellationReason?.includes('65%') ? '#15803d' : '#b91c1c',
                  }}
                >
                  {trip.refundPercentage === 65 || trip.cancellationReason?.includes('65%')
                    ? '65% Refund (Cancelled ≥3 days prior)'
                    : '0% Refund (Cancelled before 12h cutoff — No refund)'}
                </span>
                {trip.refundAmount !== undefined && (
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    • Refund Amount: ₹{Number(trip.refundAmount).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        {/* Budget Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-light, #eee)',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Itinerary Budget</span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
            ₹{Number(trip.budget || 0).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
          onClick={(e) => e.stopPropagation()} // Prevent card click if onSelect is present
        >
          {isDraft && (
            <button
              type="button"
              onClick={() => navigate(`/traveler/plan?resumeTripId=${tripId}`)}
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '8px' }}
              title="Open the saved plan and continue booking"
            >
              ▶ Continue booking
            </button>
          )}

          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(trip)}
              className={isSelected ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '8px',
              }}
              title={
                trip.status === 'Cancelled' || trip.status === 'Completed'
                  ? 'View historical itinerary (read-only)'
                  : 'View and manage daily itinerary schedule'
              }
            >
              {isSelected
                ? '📋 Viewing Schedule'
                : trip.status === 'Cancelled' || trip.status === 'Completed'
                  ? '📜 View Itinerary History'
                  : '📅 Manage Itinerary'}
            </button>
          )}

          {/* T02: Unrestricted Edit Trip removed for confirmed/active trips. Allowed only for draft Planning trips */}
          {onEdit && isDraft && (
            <button
              type="button"
              onClick={() => onEdit(trip)}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
              }}
              title="Edit draft itinerary plan"
            >
              ✏️ Edit Draft
            </button>
          )}

          {onCancel && canCancel && (
            <button
              type="button"
              onClick={() => onCancel(trip)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
                background: '#fff',
                border: '1px solid #fee2e2',
                color: '#dc2626',
                cursor: 'pointer',
              }}
            >
              ✕ Cancel Trip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
