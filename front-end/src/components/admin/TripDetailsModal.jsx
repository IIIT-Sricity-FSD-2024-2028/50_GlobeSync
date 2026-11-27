import React, { useState, useEffect } from 'react';
import { AdminDialog, Details, money } from './AdminUI';
import StatusBadge from '../common/StatusBadge';
import { bookingsApi, tripsApi } from '../../services/api';

export default function TripDetailsModal({
  isOpen,
  trip,
  ownerName,
  guideName,
  packageName,
  onClose,
  onRequestReassign,
}) {
  const [associatedBookings, setAssociatedBookings] = useState([]);
  const [reassignmentHistory, setReassignmentHistory] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  useEffect(() => {
    if (isOpen && trip?.tripId) {
      setLoadingExtras(true);
      Promise.allSettled([
        bookingsApi.getAll(),
        tripsApi.getReassignments ? tripsApi.getReassignments(trip.tripId) : Promise.resolve([]),
      ]).then(([bookingsRes, reassignRes]) => {
        if (bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value)) {
          setAssociatedBookings(bookingsRes.value.filter((b) => b.tripId === trip.tripId));
        } else {
          setAssociatedBookings([]);
        }
        if (reassignRes.status === 'fulfilled' && Array.isArray(reassignRes.value)) {
          setReassignmentHistory(reassignRes.value);
        } else {
          setReassignmentHistory([]);
        }
        setLoadingExtras(false);
      });
    }
  }, [isOpen, trip?.tripId]);

  if (!isOpen || !trip) return null;

  const history = trip.guideHistory || [];

  return (
    <AdminDialog
      title={`Trip Oversight — #${trip.tripId}: ${trip.destination}`}
      busy={false}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Current Status: </span>
            <StatusBadge status={trip.status} />
          </div>
          {onRequestReassign && !['Cancelled', 'Completed'].includes(trip.status) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onClose();
                onRequestReassign(trip);
              }}
            >
              Request Guide Reassignment
            </button>
          )}
        </div>

        <Details
          items={[
            ['Trip ID', `#${trip.tripId}`],
            ['Destination', trip.destination],
            ['Origin', trip.origin || 'Not specified'],
            ['Dates', `${trip.startDate} → ${trip.endDate}`],
            ['Customer / Owner', ownerName],
            ['Package', packageName],
            ['Budget', money(trip.budget)],
            ['Travelers Count', trip.travelersCount || 1],
            ['Assigned Guide', guideName],
            ['Guide Status', trip.guideStatus || 'Unassigned'],
          ]}
        />

        {trip.notes && (
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', fontSize: '0.9rem' }}>
            <strong>Operational Notes:</strong> {trip.notes}
          </div>
        )}

        {/* Associated Bookings */}
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>
            Associated Bookings ({associatedBookings.length})
          </h4>
          {associatedBookings.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              {loadingExtras ? 'Loading booking records...' : 'No bookings recorded for this trip.'}
            </p>
          ) : (
            <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '6px 10px' }}>Booking ID</th>
                    <th style={{ padding: '6px 10px' }}>Item</th>
                    <th style={{ padding: '6px 10px' }}>Status</th>
                    <th style={{ padding: '6px 10px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {associatedBookings.map((b) => {
                    const amt =
                      b.total_minor != null
                        ? Number(b.total_minor) / 100
                        : b.totalPriceMinor != null
                          ? Number(b.totalPriceMinor) / 100
                          : b.amount != null
                            ? Number(b.amount)
                            : Number(b.totalAmount || 0);
                    return (
                      <tr key={b.bookingId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px' }}>#{b.bookingId}</td>
                        <td style={{ padding: '6px 10px' }}>{b.type || b.itemType || 'Package'}</td>
                        <td style={{ padding: '6px 10px' }}>{b.status}</td>
                        <td style={{ padding: '6px 10px' }}>{money(amt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reassignment & Guide History */}
        {(history.length > 0 || reassignmentHistory.length > 0) && (
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>
              Guide Assignment History & Requests
            </h4>
            <div style={{ fontSize: '0.85rem', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px' }}>
              {history.map((h, i) => (
                <div key={i} style={{ marginBottom: '6px' }}>
                  <strong>{new Date(h.reassignedAt).toLocaleDateString()}:</strong> Reassigned from {h.previousGuideName || 'Unassigned'} to {h.newGuideName}. Reason: <em>"{h.reason}"</em>
                </div>
              ))}
              {reassignmentHistory.map((r, i) => (
                <div key={`req-${i}`} style={{ color: r.status === 'COMPLETED' ? '#166534' : '#64748b' }}>
                  Request #{r.id} ({r.status}): Proposed {r.proposedGuideName}. Traveler consent: {r.travelerConsent}. Guide response: {r.guideConsent}.
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </AdminDialog>
  );
}
