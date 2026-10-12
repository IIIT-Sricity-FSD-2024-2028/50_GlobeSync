import React, { useState, useEffect } from 'react';
import { paymentsApi, bookingsApi, tripsApi } from '../../services/api';

/**
 * Pure helper: Computes cancellation protection fee based on booking mode
 */
function getBookingCancellationFee(booking) {
  if (!booking) return 0;
  if (booking.cancellationFee != null) return Number(booking.cancellationFee);
  if (booking.cancellation_fee != null) return Number(booking.cancellation_fee);
  const mode = booking.transportMode || booking.type || '';
  if (mode === 'Flight') return 100;
  if (mode === 'Bus') return 70;
  if (mode === 'Train') return 50;
  return 0;
}

/**
 * Pure helper: Formats 16-digit card number with space grouping
 */
function formatCardNumber(raw) {
  const cleaned = raw.replace(/\D/g, '').slice(0, 16);
  return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
}

/**
 * Pure helper: Formats card expiry into MM/YY
 */
function formatExpiryDate(raw) {
  const cleaned = raw.replace(/\D/g, '').slice(0, 4);
  return cleaned.length >= 2 ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}` : cleaned;
}

/**
 * Pure helper: Validates payment inputs based on selected payment method
 */
function validatePaymentInputs(method, { cardNumber, expiry, cvv, upiId }) {
  const errors = {};
  if (method === 'Card') {
    const rawCard = cardNumber.replace(/\s/g, '');
    if (rawCard.length < 16) {
      errors.cardNumber = 'Please enter a valid 16-digit card number.';
    }
    if (expiry.length < 5) {
      errors.expiry = 'Please enter expiration date (MM/YY).';
    }
    if (cvv.length < 3) {
      errors.cvv = 'CVV must be 3 digits.';
    }
  } else if (method === 'UPI') {
    if (!upiId.trim() || !upiId.includes('@')) {
      errors.upiId = 'Please enter a valid UPI ID (e.g. traveler@upi).';
    }
  }
  return errors;
}

/**
 * PaymentModal: Controlled payment processing modal for pending traveler bookings.
 *
 * Responsibilities:
 * - Computes dynamic final amount with optional cancellation protection toggle
 * - Clearly identifies simulated payment processing while executing real backend transactions
 * - Enforces multi-request integrity: commits POST /payments and PUT /bookings/:id
 * - Synchronizes trip status to Confirmed only when ALL bookings for the trip are confirmed
 */
export default function PaymentModal({
  isOpen = false,
  booking = null,
  onPaymentSuccess,
  onClose,
}) {
  const hasProtection = Boolean(
    booking?.cancellationProtectionSelected || booking?.cancellation_protection_selected
  );
  const cancellationFee = getBookingCancellationFee(booking);
  const baseAmount = Number(booking?.amount || 0);

  // 1. Controlled Form State - Unconditional Hook Calls
  const [method, setMethod] = useState('Card');
  const [keepCancellation, setKeepCancellation] = useState(hasProtection);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');

  // 2. Submission & Feedback State
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const bookingId = booking?.bookingId || booking?.id || null;

  // Lifecycle Reset: Resets form only when modal opens or switches to a different booking
  useEffect(() => {
    if (isOpen && booking) {
      setMethod('Card');
      setKeepCancellation(Boolean(booking.cancellationProtectionSelected || booking.cancellation_protection_selected));
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setUpiId('');
      setErrors({});
      setPaymentError(null);
      setIsProcessing(false);
    }
  }, [isOpen, bookingId]);

  // Derived Payable Amount: Subtracts cancellation fee if traveler opts out
  const finalAmount = hasProtection && !keepCancellation
    ? Math.max(0, baseAmount - cancellationFee)
    : baseAmount;

  // Visibility guard placed strictly after all hooks have executed
  if (!isOpen || !booking) {
    return null;
  }

  // Field change handlers
  const handleCardChange = (e) => {
    setCardNumber(formatCardNumber(e.target.value));
    if (errors.cardNumber) setErrors((prev) => ({ ...prev, cardNumber: null }));
  };

  const handleExpiryChange = (e) => {
    setExpiry(formatExpiryDate(e.target.value));
    if (errors.expiry) setErrors((prev) => ({ ...prev, expiry: null }));
  };

  const handleCvvChange = (e) => {
    setCvv(e.target.value.replace(/\D/g, '').slice(0, 4));
    if (errors.cvv) setErrors((prev) => ({ ...prev, cvv: null }));
  };

  const handleUpiChange = (e) => {
    setUpiId(e.target.value);
    if (errors.upiId) setErrors((prev) => ({ ...prev, upiId: null }));
  };

  // Submit Handler: Multi-step transaction with duplicate prevention
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    const validationErrors = validatePaymentInputs(method, { cardNumber, expiry, cvv, upiId });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const targetBookingId = Number(booking.bookingId || booking.id);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Step 1: Prevent duplicate payment records by verifying existing ledger state
      let paymentRecord = null;
      try {
        const existingPayments = await paymentsApi.getByBooking(targetBookingId);
        const alreadyPaid = Array.isArray(existingPayments)
          ? existingPayments.find((p) => p.status === 'Paid')
          : null;
        if (alreadyPaid) {
          paymentRecord = alreadyPaid;
        }
      } catch {
        // Non-blocking lookup; proceed to create if check fails
      }

      if (!paymentRecord) {
        const paymentPayload = {
          amount: finalAmount,
          paymentDate: today,
          method,
          status: 'Paid',
          bookingId: targetBookingId,
        };

        try {
          paymentRecord = await paymentsApi.create(paymentPayload);
        } catch (createErr) {
          if (createErr.message?.includes('already been recorded')) {
            const existingPayments = await paymentsApi.getByBooking(targetBookingId);
            paymentRecord = Array.isArray(existingPayments)
              ? existingPayments.find((p) => p.status === 'Paid')
              : null;
            if (!paymentRecord) throw createErr;
          } else {
            throw createErr;
          }
        }
      }

      // Step 2: Confirm the booking record with final amount and protection state
      const bookingPayload = {
        bookingDate: booking.bookingDate,
        tripId: booking.tripId,
        travelerId: booking.travelerId,
        service: booking.service,
        type: booking.type,
        amount: finalAmount,
        status: 'Confirmed',
        cancellationProtectionSelected: keepCancellation,
        cancellationFee,
      };

      const updatedBooking = await bookingsApi.update(targetBookingId, bookingPayload);

      // Step 3: Trip Status Rule: Only confirm trip if ALL bookings for this trip are confirmed
      if (booking.tripId && booking.travelerId) {
        try {
          const travelerBookings = await bookingsApi.getByTraveler(booking.travelerId);
          const tripBookings = travelerBookings.filter(
            (b) => Number(b.tripId) === Number(booking.tripId)
          );
          const allOtherConfirmed = tripBookings.every((b) =>
            Number(b.bookingId || b.id) === targetBookingId ? true : b.status === 'Confirmed'
          );

          if (tripBookings.length > 0 && allOtherConfirmed) {
            await tripsApi.updateStatus(booking.tripId, 'Confirmed');
          }
        } catch (tripErr) {
          console.warn('[PaymentModal] Trip confirmation evaluation skipped:', tripErr);
        }
      }

      // Notify parent component and close modal
      onPaymentSuccess(updatedBooking, paymentRecord);
      onClose();
    } catch (err) {
      console.error('[PaymentModal] Payment failed:', err);
      setPaymentError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay-custom" onClick={onClose}>
      <div className="modal-box-custom" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header-custom">
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>💳 Complete Booking Payment</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px', margin: 0 }}>
              Booking #{booking.bookingId}: {booking.service}
            </p>
          </div>
          <button type="button" onClick={onClose} className="modal-close-custom" title="Close modal">
            ✕
          </button>
        </div>

        {/* Notice: Simulated Gateway with Backend Ledger */}
        <div
          style={{
            margin: '16px 24px 0',
            padding: '10px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#475569',
            lineHeight: 1.5,
          }}
        >
          <strong>ℹ️ Simulated Payment Gateway:</strong> Gateway card authorization is simulated client-side.
          Upon submission, a verified payment record is committed to the backend ledger (<code>POST /payments</code>)
          and booking status updates to <strong>Confirmed</strong>.
        </div>

        {/* Payable Amount Summary */}
        <div
          style={{
            margin: '16px 24px 0',
            padding: '14px 18px',
            background: 'var(--gradient-soft, #fff5f8)',
            border: '1px solid #fecdd3',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Total Payable Amount
          </span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
            ₹{finalAmount.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Optional Cancellation Protection Toggle */}
        {hasProtection && (
          <div
            style={{
              margin: '12px 24px 0',
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              background: '#fff',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={keepCancellation}
                onChange={(e) => setKeepCancellation(e.target.checked)}
                style={{ accentColor: 'var(--primary)' }}
              />
              Keep Cancellation Protection (+₹{cancellationFee.toLocaleString('en-IN')})
            </label>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', marginLeft: '22px' }}>
              If unchecked, the cancellation protection fee is subtracted from your final payable amount.
            </div>
          </div>
        )}

        {/* Payment Error Banner */}
        {paymentError && (
          <div
            className="feedback-banner error"
            style={{ margin: '14px 24px 0', padding: '10px 14px' }}
          >
            <span>⚠️ {paymentError}</span>
            <button
              type="button"
              onClick={() => setPaymentError(null)}
              className="feedback-banner-close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {/* Method Selector Tabs */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Payment Method *
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['Card', 'UPI', 'Cash'].map((m) => {
                const isSelected = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      background: isSelected ? '#fff1f4' : '#fff',
                      color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {m === 'Card' ? '💳 Card' : m === 'UPI' ? '📱 UPI' : '💵 Cash'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Credit/Debit Card Fields */}
          {method === 'Card' && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Card Number *
                </label>
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={handleCardChange}
                  className={`form-control ${errors.cardNumber ? 'error' : ''}`}
                />
                {errors.cardNumber && (
                  <span style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '3px' }}>
                    {errors.cardNumber}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Expiry Date *
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    className={`form-control ${errors.expiry ? 'error' : ''}`}
                  />
                  {errors.expiry && (
                    <span style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '3px' }}>
                      {errors.expiry}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    CVV *
                  </label>
                  <input
                    type="password"
                    maxLength="4"
                    placeholder="123"
                    value={cvv}
                    onChange={handleCvvChange}
                    className={`form-control ${errors.cvv ? 'error' : ''}`}
                  />
                  {errors.cvv && (
                    <span style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '3px' }}>
                      {errors.cvv}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* UPI Field */}
          {method === 'UPI' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                UPI ID *
              </label>
              <input
                type="text"
                placeholder="traveler@okhdfcbank"
                value={upiId}
                onChange={handleUpiChange}
                className={`form-control ${errors.upiId ? 'error' : ''}`}
              />
              {errors.upiId && (
                <span style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '3px' }}>
                  {errors.upiId}
                </span>
              )}
            </div>
          )}

          {/* Cash Notice */}
          {method === 'Cash' && (
            <div
              style={{
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginBottom: '16px',
              }}
            >
              💵 Cash on arrival selected. Submitting records the offline payment directly to the backend ledger.
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing Transaction...' : `Pay ₹${finalAmount.toLocaleString('en-IN')} ✓ (Simulated Processing)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
