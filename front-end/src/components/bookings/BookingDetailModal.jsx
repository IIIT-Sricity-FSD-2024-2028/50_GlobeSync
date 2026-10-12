import React, { useState, useEffect } from 'react';
import { paymentsApi, refundsApi } from '../../services/api';
import StatusBadge from '../common/StatusBadge';

/**
 * BookingDetailModal: Detailed view of booking specifications, backend payment ledger history,
 * and supported refund request actions.
 */
export default function BookingDetailModal({
  isOpen,
  booking = null,
  trip = null,
  onClose,
  onPayNow,
}) {
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsError, setPaymentsError] = useState(null);
  const [refundStatus, setRefundStatus] = useState(null);
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const bookingId = booking ? Number(booking.bookingId || booking.id) : null;

  const loadPayments = async (id, signal) => {
    if (!id) return;
    setLoadingPayments(true);
    setPaymentsError(null);

    try {
      // Queries GET /payments/booking/:bookingId (ownership validated by RolesGuard)
      const data = await paymentsApi.getByBooking(id, { signal });
      if (!signal?.aborted) {
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      if (!err.isCancelled && !signal?.aborted) {
        console.error('[BookingDetailModal] Could not load payments:', err);
        setPaymentsError(err.message || 'Failed to load transaction ledger for this booking.');
        setPayments([]);
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingPayments(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen || !bookingId) {
      setPayments([]);
      setPaymentsError(null);
      setRefundStatus(null);
      return;
    }

    const controller = new AbortController();
    loadPayments(bookingId, controller.signal);

    return () => {
      controller.abort();
    };
  }, [isOpen, bookingId]);

  if (!isOpen || !booking) return null;

  // Handle Traveler Refund Request
  const handleRequestRefund = async (payment) => {
    const confirmRefund = window.confirm(
      `Request refund of ₹${Number(payment.amount).toLocaleString('en-IN')} for Payment #${payment.paymentId}?`
    );
    if (!confirmRefund) return;

    setRefundSubmitting(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Calls POST /refunds (Role allowed: TRAVELER)
      const refundPayload = {
        paymentId: payment.paymentId,
        refundDate: today,
        refundStatus: 'Processing',
      };

      await refundsApi.create(refundPayload);
      setRefundStatus(`Refund request submitted for Payment #${payment.paymentId} (Status: Processing). Support will review your request.`);
    } catch (err) {
      console.error('[BookingDetailModal] Refund request failed:', err);
      alert(`Refund request failed: ${err.message}`);
    } finally {
      setRefundSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
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
          maxWidth: '540px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Booking Reference
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              BK00{booking.bookingId || booking.id}: {booking.service}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
            }}
          >
            <div>
              <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Service Type</div>
              <div style={{ fontWeight: 700, marginTop: '2px' }}>{booking.type}</div>
            </div>

            <div>
              <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Destination</div>
              <div style={{ fontWeight: 700, marginTop: '2px', color: 'var(--secondary)' }}>
                📍 {trip ? trip.destination : `Trip #${booking.tripId}`}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Booking Date</div>
              <div style={{ fontWeight: 700, marginTop: '2px' }}>{booking.bookingDate || 'TBD'}</div>
            </div>

            <div>
              <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Booking Status</div>
              <div style={{ marginTop: '2px' }}>
                <StatusBadge status={booking.status || 'Pending'} />
              </div>
            </div>

            <div style={{ gridColumn: 'span 2', borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Booked Total Amount:</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                ₹{Number(booking.amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Refund Status Banner */}
          {refundStatus && (
            <div
              style={{
                padding: '12px 16px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '10px',
                color: '#065f46',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              ✓ {refundStatus}
            </div>
          )}

          {/* Payment History Section */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💳 Payment Ledger & Transactions
            </h4>

            {loadingPayments ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                Loading ledger records...
              </div>
            ) : paymentsError ? (
              <div
                style={{
                  padding: '14px 18px',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '10px',
                  color: '#991b1b',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <strong>⚠️ Ledger Unavailable:</strong> {paymentsError}
                </div>
                <button
                  type="button"
                  onClick={() => loadPayments(bookingId)}
                  className="btn btn-secondary"
                  style={{ padding: '5px 12px', fontSize: '12px' }}
                >
                  Retry Ledger ↺
                </button>
              </div>
            ) : payments.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  background: '#fffdf5',
                  border: '1px dashed #fcd34d',
                  borderRadius: '10px',
                  fontSize: '13px',
                  color: '#92400e',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>No payment transactions recorded for this booking yet.</span>
                {booking.status === 'Pending' && onPayNow && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onPayNow(booking);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
                  >
                    Pay Now
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payments.map((p) => (
                  <div
                    key={p.paymentId}
                    style={{
                      padding: '12px 16px',
                      background: '#fff',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>
                        Payment #{p.paymentId} &bull; {p.method}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                        Date: {p.paymentDate} &bull; Amount: <strong>₹{Number(p.amount).toLocaleString('en-IN')}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={p.status || 'Paid'} />
                      {p.status === 'Paid' && (
                        <button
                          type="button"
                          onClick={() => handleRequestRefund(p)}
                          disabled={refundSubmitting}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#fff',
                            border: '1px solid #fee2e2',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Submit a refund claim"
                        >
                          Request Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          {booking.status === 'Pending' && onPayNow && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onPayNow(booking);
              }}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 700 }}
            >
              💳 Complete Payment
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
