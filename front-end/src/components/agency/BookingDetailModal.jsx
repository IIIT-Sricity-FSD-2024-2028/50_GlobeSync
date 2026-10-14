import React from 'react';
import StatusBadge from '../common/StatusBadge';

/**
 * BookingDetailModal
 * 
 * Inspects full details of an agency-booked trip or service.
 * Displays financial breakdown, commission earned, and passenger metadata.
 */
export default function BookingDetailModal({
  isOpen,
  booking,
  commissionRate = 1.5,
  onClose,
}) {
  if (!isOpen || !booking) return null;

  const amount = Number(booking.amount) || 0;
  const commission = amount * (commissionRate / 100);

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-light, #eee)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-soft, #fafafa)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Booking BK00{booking.bookingId}
              </span>
              <StatusBadge status={booking.status || 'Confirmed'} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Logged on {booking.bookingDate || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Service / Tour Package
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {booking.service}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Type: {booking.type || 'Package'} · Trip Reference #{booking.tripId}
            </div>
          </div>

          {/* Financial Breakdown Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                Billed Amount
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                ${amount.toFixed(2)}
              </div>
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ color: '#065f46', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                Earned Commission ({commissionRate}%)
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                +${commission.toFixed(2)}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                Travel Insurance
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {booking.insuranceSelected ? `Included ($${booking.insuranceAmount || 0})` : 'Standard'}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                Cancellation Protection
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {booking.cancellationProtectionSelected ? `Active ($${booking.cancellationFee || 0})` : 'None'}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              background: '#f0fdfc',
              border: '1px solid #99f6e4',
              borderRadius: '10px',
              fontSize: '12px',
              color: '#0f766e',
              lineHeight: '1.5',
            }}
          >
            ℹ️ <strong>Ledger Reconciliation:</strong> This booking is confirmed under Agency partner billing. Earned commission is queued in your commission ledger and settles upon passenger trip completion.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-light, #eee)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'var(--bg-soft, #fafafa)',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Close Dialog
          </button>
        </div>
      </div>
    </div>
  );
}
