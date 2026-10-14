import React, { useState } from 'react';
import StatusBadge from '../common/StatusBadge';

/**
 * SupportRefundDetailModal
 * 
 * Inspects refund ledger records, displays linked payment and booking data,
 * and allows transitioning refund status ('Processing' -> 'Completed' | 'Rejected').
 * 
 * CRITICAL TRANSPARENCY REQUIREMENT:
 * Explicitly distinguishes internal ledger reconciliation from payment-gateway transfers.
 */
export default function SupportRefundDetailModal({
  isOpen,
  refund,
  payment,
  booking,
  traveler,
  onClose,
  onStatusUpdate,
}) {
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  if (!isOpen || !refund) return null;

  const handleUpdate = async (newStatus) => {
    if (newStatus === refund.refundStatus || updating) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await onStatusUpdate(refund.refundId, newStatus);
    } catch (err) {
      setUpdateError(err.message || 'Failed to update refund status');
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val);
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  };

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
          maxWidth: '680px',
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
                Refund Claim REF00{refund.refundId}
              </span>
              <StatusBadge status={refund.refundStatus || 'Processing'} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Logged on {refund.refundDate || 'N/A'} {refund.refundTime ? `at ${refund.refundTime}` : ''}
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
          {/* Important Gateway Notice */}
          <div
            style={{
              padding: '14px 16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#166534',
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ℹ️ Internal Ledger Adjustment Notice
            </div>
            Updating this refund to <strong>Completed</strong> records an approved refund in the internal GlobeSync revenue ledger. Real bank account credit reversals or payment-gateway chargebacks require payment processor clearing (simulated in demo mode, or 5-7 business days in external production rails). No external funds transfer is triggered.
          </div>

          {updateError && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fee2e2',
                color: '#b91c1c',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              ⚠️ {updateError}
            </div>
          )}

          {/* Refund Breakdown Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              background: '#f8fafc',
              padding: '18px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Payment Reference
              </span>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                PMT00{refund.paymentId}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Recorded Booking Amount
              </span>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                {payment ? formatCurrency(payment.amount) : booking ? formatCurrency(booking.amount) : 'Recorded on File'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Traveler Customer
              </span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {traveler ? `${traveler.name} (TC00${traveler.travelerId || traveler.traveler_id})` : 'Registered Traveler'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Booking Service
              </span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {booking ? `${booking.service || 'Travel Package'} (BK00${booking.bookingId || booking.booking_id})` : `BK00${payment?.bookingId || 'N/A'}`}
              </div>
            </div>
          </div>

          {/* Status Decision Controls */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Supported Processing Actions
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px' }}>
              Current ledger status is <strong>{refund.refundStatus || 'Processing'}</strong>. Choose an action:
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {refund.refundStatus !== 'Completed' && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdate('Completed')}
                  className="btn btn-primary btn-sm"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    padding: '8px 16px',
                    fontWeight: 700,
                    fontSize: '13px',
                    opacity: updating ? 0.7 : 1,
                  }}
                >
                  ✓ Mark Completed (Approved Ledger Credit)
                </button>
              )}

              {refund.refundStatus !== 'Rejected' && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdate('Rejected')}
                  className="btn btn-sm"
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    padding: '8px 16px',
                    fontWeight: 700,
                    fontSize: '13px',
                    opacity: updating ? 0.7 : 1,
                  }}
                >
                  ✕ Reject Refund Claim
                </button>
              )}

              {refund.refundStatus !== 'Processing' && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdate('Processing')}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  ⏳ Return to Processing
                </button>
              )}
            </div>
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
