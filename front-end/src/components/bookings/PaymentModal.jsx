import React, { useState, useEffect, useRef } from 'react';
import { paymentsApi, bookingsApi, tripsApi, systemConfigApi } from '../../services/api';

import {
  getBookingCancellationFee,
  formatCardNumber,
  formatExpiryDate,
  validateExpiryDate,
  validatePaymentInputs,
  DEMO_CARD_DETAILS,
} from './paymentHelpers';

export {
  getBookingCancellationFee,
  formatCardNumber,
  formatExpiryDate,
  validateExpiryDate,
  validatePaymentInputs,
  DEMO_CARD_DETAILS,
};

/**
 * PaymentModal: Controlled payment processing modal for pending traveler bookings.
 *
 * Key Capabilities:
 * - Real MM/YY, month range, and expired date validation
 * - Explicitly simulated card gateway with prefill demo details
 * - Distinguishes new payments from recovery of existing Paid records
 * - Enforces recorded amount and protection selection when recovering Paid records
 * - Duplicate payment prevention (idempotent lookup + conflict handling)
 * - Adheres to backend FSM transitions (Planning -> Pending -> Confirmed) and preserves guideStatus
 * - Displays partial success state when payment succeeds but trip confirmation fails, with retry without re-charging
 * - Disallows closing or switching while submitting to prevent misleading state
 */
export default function PaymentModal({
  isOpen = false,
  booking = null,
  onPaymentSuccess,
  onClose,
}) {
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const hasProtection = Boolean(
    booking?.cancellationProtectionSelected || booking?.cancellation_protection_selected
  );
  const cancellationFee = getBookingCancellationFee(booking);
  const baseAmount = Number(booking?.amount || 0);

  // 1. Controlled Form State
  const [availableMethods, setAvailableMethods] = useState(['Card', 'UPI', 'Cash']);
  const [method, setMethod] = useState('Card');
  const [keepCancellation, setKeepCancellation] = useState(hasProtection);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');

  // 2. Submission, Feedback & Partial Success State
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [existingPaidRecord, setExistingPaidRecord] = useState(null);
  const [partialSuccess, setPartialSuccess] = useState(null);
  const [isRetryingTrip, setIsRetryingTrip] = useState(false);

  const bookingId = booking?.bookingId || booking?.id || null;

  // Lifecycle Reset: Resets form and checks for pre-existing Paid records + active platform payment methods
  useEffect(() => {
    if (isOpen && booking) {
      setKeepCancellation(Boolean(booking.cancellationProtectionSelected || booking.cancellation_protection_selected));
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setUpiId('');
      setErrors({});
      setPaymentError(null);
      setPartialSuccess(null);
      setIsProcessing(false);
      setIsRetryingTrip(false);
      setExistingPaidRecord(null);

      // Load active platform payment methods from backend configuration
      systemConfigApi
        .getPaymentMethods()
        .then((pmData) => {
          if (!isMountedRef.current || !Array.isArray(pmData)) return;
          const active = pmData
            .filter((m) => m.type === 'platform' && m.status === 'Active')
            .map((m) => m.methodKey);
          if (active.length > 0) {
            setAvailableMethods(active);
            setMethod((prev) => (active.includes(prev) ? prev : active[0]));
          }
        })
        .catch(() => {
          // Gracefully retain default native methods if config endpoint fails
        });

      // Pre-check for an existing Paid record (interrupted recovery scenario)
      const targetBookingId = Number(booking.bookingId || booking.id);
      paymentsApi
        .getByBooking(targetBookingId)
        .then((existingPayments) => {
          if (!isMountedRef.current) return;
          const alreadyPaid = Array.isArray(existingPayments)
            ? existingPayments.find((p) => p.status === 'Paid')
            : null;
          if (alreadyPaid) {
            setExistingPaidRecord(alreadyPaid);
            setMethod(alreadyPaid.method || 'Card');
            // When recovering an existing Paid record, lock the protection selection to match the payment
            if (hasProtection) {
              if (Number(alreadyPaid.amount) === baseAmount) {
                setKeepCancellation(true);
              } else if (Number(alreadyPaid.amount) === Math.max(0, baseAmount - cancellationFee)) {
                setKeepCancellation(false);
              }
            }
          }
        })
        .catch(() => {
          // Non-blocking lookup
        });
    }
  }, [isOpen, bookingId]);

  // Prevent closing when in-flight submission is running
  const handleSafeClose = () => {
    if (isProcessing || isRetryingTrip) return;
    onClose();
  };

  // Keyboard accessibility: Escape key listener respects processing lock
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!isProcessing && !isRetryingTrip) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, isRetryingTrip, onClose]);

  // Derived Payable Amount:
  // If an existing paid record exists, its recorded amount strictly governs the transaction.
  // Otherwise, subtracts cancellation fee only if traveler opts out.
  const finalAmount = existingPaidRecord
    ? Number(existingPaidRecord.amount)
    : hasProtection && !keepCancellation
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

  const handleFillDemoCard = () => {
    setMethod('Card');
    setCardNumber(DEMO_CARD_DETAILS.cardNumber);
    setExpiry(DEMO_CARD_DETAILS.expiry);
    setCvv(DEMO_CARD_DETAILS.cvv);
    setErrors({});
  };

  // Submit Handler: Multi-step transaction with duplicate prevention and recovery
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing || isRetryingTrip) return;

    // Validate inputs only if we need to process a new simulated card/UPI transaction
    if (!existingPaidRecord) {
      const validationErrors = validatePaymentInputs(method, { cardNumber, expiry, cvv, upiId });
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
    }

    setIsProcessing(true);
    setPaymentError(null);
    setPartialSuccess(null);

    const targetBookingId = Number(booking.bookingId || booking.id);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Step 1: Prevent duplicate payment records by verifying existing ledger state
      let paymentRecord = existingPaidRecord;
      let isRecoveredPayment = Boolean(existingPaidRecord);

      if (!paymentRecord) {
        try {
          const existingPayments = await paymentsApi.getByBooking(targetBookingId);
          const alreadyPaid = Array.isArray(existingPayments)
            ? existingPayments.find((p) => p.status === 'Paid')
            : null;
          if (alreadyPaid) {
            paymentRecord = alreadyPaid;
            isRecoveredPayment = true;
          }
        } catch {
          // Non-blocking lookup; proceed to create if check fails
        }
      }

      // If no existing Paid record is found, create the payment record
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
          isRecoveredPayment = false;
        } catch (createErr) {
          // If backend duplicate check detected an already recorded payment, recover it cleanly
          if (createErr.message?.includes('already been recorded')) {
            const existingPayments = await paymentsApi.getByBooking(targetBookingId);
            paymentRecord = Array.isArray(existingPayments)
              ? existingPayments.find((p) => p.status === 'Paid')
              : null;
            if (!paymentRecord) throw createErr;
            isRecoveredPayment = true;
          } else {
            throw createErr;
          }
        }
      }

      // Step 2: Confirm the booking record.
      // CRITICAL POLICY: When recovering an existing Paid record, use its recorded amount and details.
      // Do NOT reuse that payment while silently changing the booking to a different amount or protection selection.
      let bookingAmountToConfirm = finalAmount;
      let protectionToConfirm = keepCancellation;

      if (isRecoveredPayment && paymentRecord) {
        bookingAmountToConfirm = Number(paymentRecord.amount);
        // Determine whether protection was selected in the recorded payment
        if (hasProtection) {
          if (bookingAmountToConfirm === baseAmount) {
            protectionToConfirm = true;
          } else if (bookingAmountToConfirm === Math.max(0, baseAmount - cancellationFee)) {
            protectionToConfirm = false;
          }
        }
      }

      const bookingPayload = {
        bookingDate: booking.bookingDate,
        tripId: booking.tripId,
        travelerId: booking.travelerId,
        service: booking.service,
        type: booking.type,
        amount: bookingAmountToConfirm,
        status: 'Confirmed',
        cancellationProtectionSelected: protectionToConfirm,
        cancellationFee,
      };

      const updatedBooking = await bookingsApi.update(targetBookingId, bookingPayload);

      // Step 3: Trip Status Rule: Only confirm trip if ALL bookings for this trip are confirmed.
      // Respects backend FSM transitions:
      // Planning -> Pending -> Confirmed
      // guideStatus is kept separate and untouched.
      let tripConfirmed = false;
      let tripConfirmationError = null;

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
            const currentTrip = await tripsApi.getById(booking.tripId);
            // If currently in 'Planning', advance to 'Pending' first before 'Confirmed'
            if (currentTrip.status === 'Planning') {
              await tripsApi.updateStatus(booking.tripId, 'Pending');
            }
            if (currentTrip.status !== 'Confirmed' && currentTrip.status !== 'Completed') {
              await tripsApi.updateStatus(booking.tripId, 'Confirmed');
            }
            tripConfirmed = true;
          }
        } catch (tripErr) {
          console.warn('[PaymentModal] Trip confirmation failed:', tripErr);
          tripConfirmationError = tripErr.message || 'Trip status could not be updated to Confirmed.';
        }
      }

      // If trip confirmation threw an error, render partial success state with recovery
      if (tripConfirmationError) {
        if (!isMountedRef.current) return;
        setPartialSuccess({
          updatedBooking,
          paymentRecord,
          isRecovered: isRecoveredPayment,
          tripId: booking.tripId,
          error: tripConfirmationError,
        });
        setIsProcessing(false);
        return;
      }

      // Complete Success: notify parent component and close modal
      onPaymentSuccess(updatedBooking, paymentRecord, {
        isRecovered: isRecoveredPayment,
        tripConfirmed,
        tripConfirmationError: null,
      });
      onClose();
    } catch (err) {
      console.error('[PaymentModal] Payment failed:', err);
      if (isMountedRef.current) {
        setPaymentError(err.message || 'Payment processing failed. Please try again.');
        setIsProcessing(false);
      }
    }
  };

  // Direct Recovery: Retry trip confirmation without re-submitting payment
  const handleRetryTripConfirmation = async () => {
    if (!partialSuccess || isRetryingTrip) return;
    setIsRetryingTrip(true);

    try {
      const currentTrip = await tripsApi.getById(partialSuccess.tripId);
      if (currentTrip.status === 'Planning') {
        await tripsApi.updateStatus(partialSuccess.tripId, 'Pending');
      }
      await tripsApi.updateStatus(partialSuccess.tripId, 'Confirmed');

      // Success! Notify parent and close modal
      onPaymentSuccess(partialSuccess.updatedBooking, partialSuccess.paymentRecord, {
        isRecovered: partialSuccess.isRecovered,
        tripConfirmed: true,
        tripConfirmationError: null,
      });
      onClose();
    } catch (retryErr) {
      console.error('[PaymentModal] Trip confirmation retry failed:', retryErr);
      if (isMountedRef.current) {
        setPartialSuccess((prev) => ({
          ...prev,
          error: retryErr.message || 'Trip confirmation retry failed.',
        }));
        setIsRetryingTrip(false);
      }
    }
  };

  return (
    <div className="modal-overlay-custom" onClick={handleSafeClose}>
      <div className="modal-box-custom" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header-custom">
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
              💳 Complete Booking Payment
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px', margin: 0 }}>
              Booking #{booking.bookingId}: {booking.service}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSafeClose}
            className="modal-close-custom"
            title="Close modal"
            disabled={isProcessing || isRetryingTrip}
            style={{ opacity: isProcessing || isRetryingTrip ? 0.4 : 1, cursor: isProcessing || isRetryingTrip ? 'not-allowed' : 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Partial Success View */}
        {partialSuccess ? (
          <div style={{ padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                Payment & Booking Confirmed (Partial Success)
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                {partialSuccess.isRecovered
                  ? `Recovered existing payment of ₹${Number(partialSuccess.paymentRecord.amount).toLocaleString('en-IN')} (Payment #${partialSuccess.paymentRecord.paymentId}).`
                  : `Payment of ₹${Number(partialSuccess.paymentRecord.amount).toLocaleString('en-IN')} was successfully recorded (Payment #${partialSuccess.paymentRecord.paymentId}).`}
                {' '}Booking #{partialSuccess.updatedBooking.bookingId} status is now <strong>Confirmed</strong>.
              </p>
            </div>

            <div
              style={{
                padding: '12px 16px',
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#92400e',
                marginBottom: '20px',
                lineHeight: 1.5,
              }}
            >
              <strong>Trip Status Notice:</strong> Trip #{partialSuccess.tripId} status update could not be automatically confirmed:
              <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#b45309' }}>
                "{partialSuccess.error}"
              </div>
              <div style={{ marginTop: '6px', fontSize: '12px' }}>
                ✓ Your payment is safe. <strong>No repeat payment will ever be charged.</strong> You can retry updating the trip status below.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  onPaymentSuccess(partialSuccess.updatedBooking, partialSuccess.paymentRecord, {
                    isRecovered: partialSuccess.isRecovered,
                    tripConfirmed: false,
                    tripConfirmationError: partialSuccess.error,
                    tripId: partialSuccess.tripId,
                  });
                  onClose();
                }}
                className="btn btn-secondary"
                disabled={isRetryingTrip}
              >
                Dismiss & View Bookings
              </button>
              <button
                type="button"
                onClick={handleRetryTripConfirmation}
                className="btn btn-primary"
                disabled={isRetryingTrip}
              >
                {isRetryingTrip ? 'Retrying Confirmation...' : 'Retry Trip Confirmation ↺'}
              </button>
            </div>
          </div>
        ) : (
          <>
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

            {/* Existing Payment Recovery Notice */}
            {existingPaidRecord && (
              <div
                style={{
                  margin: '12px 24px 0',
                  padding: '12px 14px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#166534',
                  lineHeight: 1.5,
                }}
              >
                <strong>⚡ Existing Paid Record Detected (Recovery Mode):</strong> A verified payment (Payment #{existingPaidRecord.paymentId})
                for <strong>₹{Number(existingPaidRecord.amount).toLocaleString('en-IN')}</strong> was previously recorded in the backend ledger.
                Submitting will confirm this booking using the recorded transaction without charging a duplicate payment.
              </div>
            )}

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
                {existingPaidRecord ? 'Recorded Payment Amount' : 'Total Payable Amount'}
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, cursor: existingPaidRecord ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={keepCancellation}
                    disabled={Boolean(existingPaidRecord) || isProcessing}
                    onChange={(e) => setKeepCancellation(e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  Keep Cancellation Protection (+₹{cancellationFee.toLocaleString('en-IN')})
                </label>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', marginLeft: '22px' }}>
                  {existingPaidRecord
                    ? 'Protection selection locked to match previously recorded payment.'
                    : 'If unchecked, the cancellation protection fee is subtracted from your final payable amount.'}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>
                    Payment Method *
                  </label>
                  {method === 'Card' && !existingPaidRecord && (
                    <button
                      type="button"
                      onClick={handleFillDemoCard}
                      disabled={isProcessing}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#1d4ed8',
                        cursor: 'pointer',
                      }}
                    >
                      Use Demo Card Details ⚡
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {availableMethods.map((m) => {
                    const isSelected = method === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        disabled={isProcessing || Boolean(existingPaidRecord)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? '#fff1f4' : '#fff',
                          color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '13px',
                          cursor: isProcessing || Boolean(existingPaidRecord) ? 'not-allowed' : 'pointer',
                          opacity: isProcessing ? 0.6 : 1,
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
                      placeholder="4532 0000 0000 0000"
                      value={cardNumber}
                      disabled={isProcessing}
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
                        Expiry Date * (MM/YY)
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={expiry}
                        disabled={isProcessing}
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
                        disabled={isProcessing}
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
                    disabled={isProcessing}
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
                  onClick={handleSafeClose}
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
                  {isProcessing
                    ? 'Processing Transaction...'
                    : existingPaidRecord
                    ? `Recover Payment (₹${finalAmount.toLocaleString('en-IN')}) & Confirm Booking ✓`
                    : `Pay ₹${finalAmount.toLocaleString('en-IN')} ✓ (Simulated Processing)`}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
