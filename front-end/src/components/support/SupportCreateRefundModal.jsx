import React, { useState, useMemo } from 'react';

/**
 * SupportCreateRefundModal
 * 
 * Allows customer support specialists to initiate a refund for a traveler's booking.
 * Validates selected payment/booking and enforces explicit gateway distinction.
 */
export default function SupportCreateRefundModal({
  isOpen,
  travelers = [],
  bookings = [],
  payments = [],
  onClose,
  onCreate,
}) {
  const [selectedTravelerId, setSelectedTravelerId] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [refundType, setRefundType] = useState('Full Refund');
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('Service Issue');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  if (!isOpen) return null;

  // Filter bookings belonging to selected traveler
  const travelerBookings = useMemo(() => {
    if (!selectedTravelerId) return [];
    return bookings.filter(
      (b) => Number(b.travelerId || b.traveler_id) === Number(selectedTravelerId)
    );
  }, [selectedTravelerId, bookings]);

  // Selected booking details
  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return bookings.find(
      (b) => Number(b.bookingId || b.booking_id) === Number(selectedBookingId)
    );
  }, [selectedBookingId, bookings]);

  // Find corresponding payment record
  const matchingPayment = useMemo(() => {
    if (!selectedBookingId) return null;
    return payments.find(
      (p) => Number(p.bookingId || p.booking_id) === Number(selectedBookingId)
    );
  }, [selectedBookingId, payments]);

  const handleBookingChange = (bId) => {
    setSelectedBookingId(bId);
    if (!bId) {
      setRefundAmount('');
      return;
    }
    const foundBooking = bookings.find(
      (b) => Number(b.bookingId || b.booking_id) === Number(bId)
    );
    if (foundBooking) {
      setRefundAmount(String(foundBooking.amount || '0'));
    }
  };

  const validate = () => {
    const errs = {};
    if (!selectedTravelerId) errs.traveler = 'Please select a traveler';
    if (!selectedBookingId) errs.booking = 'Please select a booking to refund';
    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      errs.amount = 'Please enter a valid positive refund amount';
    } else if (selectedBooking && amt > (selectedBooking.amount || 0)) {
      errs.amount = `Refund cannot exceed original booking amount ($${selectedBooking.amount})`;
    }
    if (!reason) errs.reason = 'Please select a refund reason';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    const now = new Date();
    const paymentId = matchingPayment?.paymentId || matchingPayment?.payment_id || 1;

    try {
      await onCreate({
        paymentId: Number(paymentId),
        refundDate: now.toISOString().split('T')[0],
        refundTime: now.toTimeString().split(' ')[0],
        refundStatus: 'Processing',
      });
      // Reset
      setSelectedTravelerId('');
      setSelectedBookingId('');
      setRefundAmount('');
      setNotes('');
      setErrors({});
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Failed to initiate refund. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
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
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Process Refund Claim 💰
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Initiate an internal refund request for an existing booking payment
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
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Transparency Disclaimer Notice */}
          <div
            style={{
              padding: '12px 14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              marginBottom: '18px',
              fontSize: '12px',
              lineHeight: '1.5',
              color: '#1e40af',
            }}
          >
            <strong>Note on Gateway vs Internal Record:</strong> This action creates an internal refund record in status <em>Processing</em>. It does not trigger external automated banking wire transfers; actual payment gateway reversals operate on simulated demo records or require 5-7 business days for financial institution clearing.
          </div>

          {submitError && (
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
              ⚠️ {submitError}
            </div>
          )}

          {/* Traveler Select */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Traveler *
            </label>
            <select
              value={selectedTravelerId}
              onChange={(e) => {
                setSelectedTravelerId(e.target.value);
                setSelectedBookingId('');
                setRefundAmount('');
                if (errors.traveler) setErrors((prev) => ({ ...prev, traveler: null }));
              }}
              className="form-control"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.traveler ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            >
              <option value="">-- Select traveler --</option>
              {travelers.map((t) => (
                <option key={t.travelerId || t.traveler_id} value={t.travelerId || t.traveler_id}>
                  {t.name} (TC00{t.travelerId || t.traveler_id})
                </option>
              ))}
            </select>
            {errors.traveler && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.traveler}
              </span>
            )}
          </div>

          {/* Booking Select */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Booking Reference *
            </label>
            <select
              disabled={!selectedTravelerId}
              value={selectedBookingId}
              onChange={(e) => {
                handleBookingChange(e.target.value);
                if (errors.booking) setErrors((prev) => ({ ...prev, booking: null }));
              }}
              className="form-control"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.booking ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '14px',
                background: !selectedTravelerId ? '#f1f5f9' : '#fff',
              }}
            >
              <option value="">-- Choose traveler booking --</option>
              {travelerBookings.map((b) => (
                <option key={b.bookingId || b.booking_id} value={b.bookingId || b.booking_id}>
                  BK00{b.bookingId || b.booking_id} — {b.service || 'Trip Booking'} (${b.amount}) [{b.status}]
                </option>
              ))}
            </select>
            {errors.booking && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.booking}
              </span>
            )}
            {selectedTravelerId && travelerBookings.length === 0 && (
              <span style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                No active bookings found for this traveler.
              </span>
            )}
          </div>

          {/* Booking Preview Card */}
          {selectedBooking && (
            <div
              style={{
                padding: '12px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}
            >
              <div><strong>Service:</strong> {selectedBooking.service}</div>
              <div><strong>Original Amount:</strong> ${selectedBooking.amount}</div>
              <div><strong>Booking Date:</strong> {selectedBooking.bookingDate}</div>
              <div><strong>Payment Ref:</strong> {matchingPayment ? `PMT00${matchingPayment.paymentId}` : 'On File'}</div>
            </div>
          )}

          {/* Refund Type & Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Refund Type *
              </label>
              <select
                value={refundType}
                onChange={(e) => {
                  setRefundType(e.target.value);
                  if (e.target.value === 'Full Refund' && selectedBooking) {
                    setRefundAmount(String(selectedBooking.amount || 0));
                  }
                }}
                className="form-control"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              >
                <option value="Full Refund">Full Refund (100%)</option>
                <option value="Partial Refund">Partial Refund</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Refund Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={refundAmount}
                onChange={(e) => {
                  setRefundAmount(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
                }}
                placeholder="0.00"
                className="form-control"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: errors.amount ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              {errors.amount && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.amount}
                </span>
              )}
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Reason for Refund *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            >
              <option value="Service Issue">Service / Guide Issue</option>
              <option value="Cancellation">Trip Cancellation</option>
              <option value="Overbooking">Overbooking / Capacity</option>
              <option value="Flight Delay">Flight Delay / Schedule Shift</option>
              <option value="Other">Other Operational Exception</option>
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Internal Investigation Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide case investigation context or traveler communication summary..."
              rows={2}
              className="form-control"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '10px 18px', fontSize: '14px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                padding: '10px 22px',
                fontSize: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                fontWeight: 700,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Recording Refund...' : 'Initiate Refund Claim ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
