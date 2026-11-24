import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { bookingsApi } from '../../services/api';
import AgencyCheckoutModal from './AgencyCheckoutModal';

/**
 * BookingDetailModal
 * 
 * Inspects full details of an agency-booked trip or service.
 * Displays financial breakdown, commission earned, and passenger metadata.
 * Includes actionable controls: Pay & Confirm, Cancel Booking (with preview),
 * Quick Navigation (Activities, Expenses, Messages), and native window.print() Voucher.
 */
export default function BookingDetailModal({
  isOpen,
  booking,
  commissionRate = 10.0,
  onClose,
  onBookingUpdated,
}) {
  const navigate = useNavigate();

  // State for checkout modal
  const [showCheckout, setShowCheckout] = useState(false);

  // State for cancellation flow
  const [showCancelSection, setShowCancelSection] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelPreview, setCancelPreview] = useState(null);
  const [cancelReason, setCancelReason] = useState('Client requested cancellation');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  if (!isOpen || !booking) return null;

  const amount = Number(booking.amount) || 0;
  const commission = Math.round(amount * (Number(commissionRate) / 100));
  const isPendingPayment = ['pending', 'held', 'pending payment'].includes(
    (booking.status || '').toLowerCase()
  );
  const isCancelled = (booking.status || '').toLowerCase() === 'cancelled';

  const handleStartCancel = async () => {
    setShowCancelSection(true);
    setCancelLoading(true);
    setCancelError(null);
    try {
      const preview = await bookingsApi.cancellationPreview(booking.bookingId);
      setCancelPreview(preview);
    } catch (err) {
      console.error('Failed to load cancellation preview:', err);
      setCancelError(err.message || 'Could not calculate refund preview.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      await bookingsApi.cancel(booking.bookingId, cancelReason || 'Agency requested cancellation');
      if (onBookingUpdated) onBookingUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      setCancelError(err.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-booking-voucher, #printable-booking-voucher * {
            visibility: visible !important;
          }
          #printable-booking-voucher {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 30px !important;
            background: #fff !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 999999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

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
          id="printable-booking-voucher"
          className="card"
          style={{
            background: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '620px',
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
                Client Reservation Voucher · Issued {booking.bookingDate || 'N/A'}
              </p>
            </div>
            <button
              className="no-print"
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
            {/* Quick Action Navigation Strip */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/agency/trips');
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#334155',
                }}
              >
                📅 Day-Wise Activities
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(booking.tripId ? `/agency/expenses?tripId=${booking.tripId}` : '/agency/expenses');
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#334155',
                }}
              >
                💵 Trip Expenses
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/agency/messages');
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#334155',
                }}
              >
                💬 Message Guide
              </button>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid #0d9488',
                  background: '#f0fdfa',
                  color: '#0f766e',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                🖨️ Print Voucher
              </button>
            </div>

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
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {booking.service}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                Type: <strong>{booking.type || 'Custom Tour'}</strong> · Linked Trip Reference: <strong>#{booking.tripId}</strong>
              </div>
            </div>

            {/* Financial Breakdown Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
                gap: '14px',
                marginBottom: '20px',
                fontSize: '13px',
              }}
            >
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Retail Billed Amount
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  ₹{amount.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ color: '#065f46', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Agency Commission ({commissionRate}%)
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                  +₹{commission.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Travel Insurance
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {booking.insuranceSelected ? `Included (₹${booking.insuranceAmount || 0})` : 'Standard'}
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Cancellation Protection
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {booking.cancellationProtectionSelected ? `Active (₹${booking.cancellationFee || 0})` : 'None'}
                </div>
              </div>
            </div>

            {/* Cancellation Confirmation Section */}
            {showCancelSection && (
              <div
                className="no-print"
                style={{
                  background: '#fff1f2',
                  border: '1.5px solid #fecdd3',
                  borderRadius: '12px',
                  padding: '18px',
                  marginBottom: '20px',
                }}
              >
                <h4 style={{ margin: '0 0 10px 0', color: '#9f1239', fontSize: '15px', fontWeight: 700 }}>
                  ⚠️ Confirm Booking Cancellation
                </h4>

                {cancelLoading ? (
                  <div style={{ fontSize: '13px', color: '#881337' }}>
                    Computing real-time refund policy & fee preview...
                  </div>
                ) : cancelError ? (
                  <div style={{ fontSize: '13px', color: '#b91c1c', marginBottom: '12px' }}>
                    {cancelError}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '14px',
                        background: '#fff',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #ffe4e6',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: '#9f1239', textTransform: 'uppercase', fontWeight: 700 }}>
                          Refund Amount
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                          ₹{Number(cancelPreview?.refundAmount ?? cancelPreview?.amount ?? 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9f1239', textTransform: 'uppercase', fontWeight: 700 }}>
                          Cancellation Penalty
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#e11d48', marginTop: '2px' }}>
                          ₹{Number(cancelPreview?.fee ?? cancelPreview?.cancellationFee ?? 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: '#881337', marginBottom: '14px', lineHeight: '1.4' }}>
                      ℹ️ {cancelPreview?.policyNote || cancelPreview?.message || 'Cancellation follows standard tiered policy based on departure timeline.'}
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#881337', marginBottom: '4px' }}>
                        Reason for Cancellation:
                      </label>
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="e.g. Client requested emergency cancellation"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #fecdd3',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setShowCancelSection(false)}
                        disabled={cancelSubmitting}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Keep Booking
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmCancel}
                        disabled={cancelSubmitting}
                        style={{
                          padding: '6px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#e11d48',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: cancelSubmitting ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {cancelSubmitting ? 'Cancelling...' : 'Confirm & Process Refund'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

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
              ℹ️ <strong>Ledger Reconciliation:</strong> Reseller partner reservation. Billed amount and commission settle according to registered corporate terms.
            </div>
          </div>

          {/* Footer Controls */}
          <div
            className="no-print"
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-light, #eee)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-soft, #fafafa)',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isCancelled && !showCancelSection && (
                <button
                  type="button"
                  onClick={handleStartCancel}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5',
                    background: '#fff',
                    color: '#dc2626',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ❌ Cancel Booking
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {isPendingPayment && (
                <button
                  type="button"
                  onClick={() => setShowCheckout(true)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(13,148,136,0.3)',
                  }}
                >
                  💳 Pay & Confirm Booking
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary btn-sm"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reusable AgencyCheckoutModal */}
      {showCheckout && (
        <AgencyCheckoutModal
          isOpen={showCheckout}
          trip={{
            tripId: booking.tripId,
            budget: booking.amount,
            title: booking.service,
            agencyId: booking.agencyId,
            destination: booking.service,
          }}
          agencyCommissionRate={commissionRate}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false);
            if (onBookingUpdated) onBookingUpdated();
            onClose();
          }}
        />
      )}
    </>
  );
}
