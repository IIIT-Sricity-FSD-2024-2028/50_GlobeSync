import React, { useState } from 'react';
import { tripsApi } from '../../services/api';

export default function AgencyCancelTripModal({
  isOpen,
  trip,
  onClose,
  onSuccess,
  showToast,
}) {
  if (!isOpen || !trip) return null;

  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirmCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const updated = await tripsApi.updateStatus(trip.tripId, 'Cancelled');
      if (showToast) {
        showToast(`Trip #${trip.tripId} cancelled. Linked commission entry has been marked VOID. ✓`);
      }
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      console.error('Cancel trip error:', err);
      setError(err.message || 'Failed to cancel trip.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            ⚠️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Cancel Client Trip #{trip.tripId}?
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {trip.title || trip.destination}
            </span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px 0' }}>
          Are you sure you want to cancel this client trip? The status will permanently transition to{' '}
          <strong style={{ color: '#b91c1c' }}>Cancelled</strong>, and any associated commission ledger entry will be marked as{' '}
          <strong>VOID / CANCELLED</strong>.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={cancelling}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Keep Trip
          </button>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={cancelling}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: cancelling ? 'not-allowed' : 'pointer',
              opacity: cancelling ? 0.7 : 1,
            }}
          >
            {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
}

