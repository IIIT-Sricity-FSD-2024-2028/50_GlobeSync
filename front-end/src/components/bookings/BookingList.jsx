import React from 'react';
import StatusBadge from '../common/StatusBadge';

const TYPE_ICONS = {
  Flight: '✈️',
  Hotel: '🏨',
  Transport: '🚌',
  Activity: '🎯',
};

/**
 * BookingList: Interactive table/cards for traveler travel bookings with status badges,
 * action buttons (Pay Now, View History, Cancel Booking), and filter-aware empty states.
 */
export default function BookingList({
  bookings = [],
  trips = [],
  onPayNow,
  onView,
  onCancel,
  hasActiveFilters = false,
  onClearFilters,
}) {
  const getTripDestination = (tripId) => {
    const trip = trips.find((t) => (t.tripId || t.id) === tripId);
    return trip ? `📍 ${trip.destination}` : `Trip #${tripId}`;
  };

  if (bookings.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          borderRadius: '16px',
          background: '#fff',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>🎫</div>
        {hasActiveFilters ? (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>No matching bookings found</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '420px', margin: '6px auto 18px' }}>
              No bookings match your current type, status, or search filters.
            </p>
            {onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
              >
                Clear Filters ↺
              </button>
            )}
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>No bookings recorded yet</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '420px', margin: '6px auto 0' }}>
              Bookings for flights, stays, and transit are generated when you plan a new travel itinerary.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 18px' }}>Booking ID</th>
              <th style={{ padding: '14px 18px' }}>Service / Provider</th>
              <th style={{ padding: '14px 18px' }}>Trip Destination</th>
              <th style={{ padding: '14px 18px' }}>Booking Date</th>
              <th style={{ padding: '14px 18px' }}>Status</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const icon = TYPE_ICONS[b.type] || '📋';
              const canCancel = b.status !== 'Cancelled';
              const isPending = b.status === 'Pending';

              return (
                <tr
                  key={b.bookingId || b.id}
                  style={{
                    borderBottom: '1px solid var(--border-light, #eee)',
                    transition: 'background 0.2s',
                  }}
                >
                  <td style={{ padding: '16px 18px', fontWeight: 800, color: 'var(--primary)' }}>
                    BK00{b.bookingId || b.id}
                  </td>

                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.service}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{b.type}</div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '16px 18px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {getTripDestination(b.tripId)}
                  </td>

                  <td style={{ padding: '16px 18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    📅 {b.bookingDate || 'TBD'}
                  </td>

                  <td style={{ padding: '16px 18px' }}>
                    <StatusBadge status={b.status || 'Pending'} />
                  </td>

                  <td style={{ padding: '16px 18px', textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: '15px' }}>
                    ₹{Number(b.amount || 0).toLocaleString('en-IN')}
                  </td>

                  <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      {isPending && onPayNow && (
                        <button
                          type="button"
                          onClick={() => onPayNow(b)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            color: '#065f46',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          💳 Pay Now
                        </button>
                      )}

                      {onView && (
                        <button
                          type="button"
                          onClick={() => onView(b)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 600, borderRadius: '8px' }}
                          title="View booking & payment history"
                        >
                          👁 History
                        </button>
                      )}

                      {canCancel && onCancel && (
                        <button
                          type="button"
                          onClick={() => onCancel(b)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: '#fff',
                            border: '1px solid #fee2e2',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Cancel booking"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
