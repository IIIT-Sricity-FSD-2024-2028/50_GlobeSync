import React from 'react';
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
  if (!trip) return null;

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
            <h4 style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)' }}>
              📍 {trip.destination}
            </h4>
          </div>
          <StatusBadge status={trip.status || 'Pending'} />
        </div>

        {/* Schedule & Metadata */}
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
          <div>📅 {trip.startDate || 'TBD'} → {trip.endDate || 'TBD'}</div>
          {trip.guideId && (
            <div style={{ color: '#047857' }}>
              👤 Guide Assigned (ID #{trip.guideId})
            </div>
          )}
          {trip.packageId && (
            <div style={{ color: '#6d28d9' }}>
              📦 Pre-Planned Package #{trip.packageId}
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
              title="View and manage daily itinerary schedule"
            >
              {isSelected ? '📋 Viewing Schedule' : '📅 Manage Itinerary'}
            </button>
          )}

          {onEdit && (
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
            >
              ✏️ Edit
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
