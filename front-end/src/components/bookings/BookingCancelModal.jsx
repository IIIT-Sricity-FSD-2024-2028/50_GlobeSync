import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';

const COMMON_BOOKING_REASONS = [
  'Trip reschedule or itinerary cancellation',
  'Found better alternative / lower pricing',
  'Personal or medical emergency',
  'Booking details error / duplicate booking',
  'Flight / transport schedule change',
  'Other reason',
];

export default function BookingCancelModal({
  isOpen,
  booking,
  onClose,
  onConfirm,
  isCancelling = false,
  error = null,
}) {
  if (!isOpen || !booking) return null;

  const navigate = useNavigate();
  const { role } = useSession();
  const [selectedReason, setSelectedReason] = useState(COMMON_BOOKING_REASONS[0]);
  const [comments, setComments] = useState('');
  const [validationError, setValidationError] = useState('');

  const bookingId = booking.bookingId || booking.id;
  const hasProtection = Boolean(booking.cancellationProtectionSelected);
  const scheduledDepRaw =
    booking.departureAtUtc ||
    booking.departure_at_utc ||
    booking.trip?.startDate ||
    booking.startDate ||
    null;

  // ── Cancellation Policy Calculation (3-Day & 12-Hour Cutoff Rules) ──────
  const getRefundPolicy = () => {
    const amount = Number(booking.amount) || 0;
    if (hasProtection) {
      return {
        percentage: 100,
        isProtected: true,
        isBlocked: false,
        isEligible: true,
        hasExactTime: Boolean(booking.departureAtUtc || booking.departure_at_utc),
        amount,
        refundAmount: amount,
        penaltyAmount: 0,
        daysUntil: null,
        hoursUntil: null,
      };
    }

    if (!scheduledDepRaw) {
      return {
        percentage: 65,
        isProtected: false,
        isBlocked: false,
        isEligible: true,
        hasExactTime: false,
        amount,
        refundAmount: Math.round(amount * 0.65),
        penaltyAmount: amount - Math.round(amount * 0.65),
        daysUntil: null,
        hoursUntil: null,
      };
    }

    const now = new Date();
    const hasExactTime = Boolean(booking.departureAtUtc || booking.departure_at_utc || String(scheduledDepRaw).includes('T'));
    const d = new Date(String(scheduledDepRaw).includes('T') ? scheduledDepRaw : `${String(scheduledDepRaw).slice(0, 10)}T00:00:00`);
    const diffMs = d.getTime() - now.getTime();
    const hoursUntil = diffMs / (1000 * 60 * 60);
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const isBlocked = hoursUntil < 12;
    const isEligible = !isBlocked && daysUntil >= 3;
    const percentage = isBlocked ? 0 : isEligible ? 65 : 0;
    const refundAmount = Math.round(amount * (percentage / 100));
    const penaltyAmount = amount - refundAmount;

    return {
      percentage,
      isProtected: false,
      isBlocked,
      isEligible,
      hasExactTime,
      amount,
      refundAmount,
      penaltyAmount,
      daysUntil,
      hoursUntil: Math.round(hoursUntil * 10) / 10,
    };
  };

  const handleContactSupport = () => {
    const supportPath = role === 'agency' ? '/agency/support' : '/traveler/support';
    const params = new URLSearchParams();
    params.set('bookingId', String(bookingId));
    if (booking.tripId) params.set('tripId', String(booking.tripId));
    params.set('issueType', 'Cancellation Assistance');
    if (selectedReason) params.set('reason', selectedReason);
    if (comments.trim()) params.set('notes', comments.trim());
    onClose();
    navigate(`${supportPath}?${params.toString()}`);
  };

  const refund = getRefundPolicy();

  const handleConfirm = () => {
    if (refund.isBlocked) {
      setValidationError('Cancellation window has closed. Bookings cannot be cancelled within 12 hours of the scheduled date.');
      return;
    }
    if (!selectedReason) {
      setValidationError('Please select a cancellation reason.');
      return;
    }
    if (selectedReason === 'Other reason' && !comments.trim()) {
      setValidationError('Please provide more details in the comments field.');
      return;
    }

    const refundTag = refund.isProtected
      ? '[100% Refund - Protected by Cancellation Protection]'
      : refund.isEligible
      ? '[65% Refund - Cancelled ≥3 days before date]'
      : '[0% Refund - Cancelled before 12h cutoff (No refund)]';

    const finalReason = comments.trim()
      ? `${selectedReason}: ${comments.trim()} ${refundTag}`
      : `${selectedReason} ${refundTag}`;

    onConfirm(booking, finalReason);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #fee2e2',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 800,
              flexShrink: 0,
              border: '2px solid #fca5a5',
            }}
          >
            ⚠️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#991b1b' }}>
              Cancel Booking Reservation
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#7f1d1d' }}>
              BK00{bookingId} &bull; {booking.service} ({booking.type})
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '12px 14px',
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                color: '#991b1b',
                fontSize: '13px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Booking Summary Card */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                {booking.service}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Type: {booking.type} &bull; Date: {booking.bookingDate}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                ₹{Number(booking.amount).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* 3-Day & 12-Hour Cancellation Policy Breakdown */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              border: refund.isBlocked
                ? '1px solid #fecaca'
                : refund.isProtected || refund.isEligible
                ? '1px solid #bbf7d0'
                : '1px solid #fed7aa',
              background: refund.isBlocked
                ? '#fef2f2'
                : refund.isProtected || refund.isEligible
                ? '#f0fdf4'
                : '#fff7ed',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '16px',
                  background: refund.isBlocked
                    ? '#fee2e2'
                    : refund.isProtected
                    ? '#e0e7ff'
                    : refund.isEligible
                    ? '#dcfce7'
                    : '#ffedd5',
                  color: refund.isBlocked
                    ? '#991b1b'
                    : refund.isProtected
                    ? '#4338ca'
                    : refund.isEligible
                    ? '#15803d'
                    : '#c2410c',
                }}
              >
                {refund.isBlocked
                  ? '🛑 Cancellation Closed (<12h)'
                  : refund.isProtected
                  ? '🛡️ Protected (100% Refund)'
                  : refund.isEligible
                  ? '🟢 Standard Tier (65% Refund)'
                  : '⚠️ Permitted (0% Refund — Before 12h Cutoff)'}
              </span>
              {refund.hoursUntil != null && (
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  {refund.hoursUntil > 0
                    ? refund.daysUntil > 2
                      ? `In ${refund.daysUntil} days`
                      : `In ${refund.hoursUntil} hours`
                    : 'Starts today'}
                </span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: refund.isBlocked ? '#991b1b' : refund.isProtected || refund.isEligible ? '#166534' : '#9a3412', lineHeight: 1.4 }}>
              {refund.isBlocked
                ? 'Cancellation window has closed. Bookings cannot be cancelled within 12 hours of the scheduled reservation date. Please contact 24/7 Support for assistance.'
                : refund.isProtected
                ? 'Cancellation protection active: 100% refund without deduction.'
                : refund.isEligible
                ? 'Cancelled at least 3 days before date: 65% refund approved (35% cancellation deduction).'
                : 'Cancelled before 12h cutoff but less than 3 days prior: Cancellation allowed, but non-refundable (0% refund per policy).'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '6px', borderTop: refund.isBlocked ? '1px solid #fee2e2' : refund.isProtected || refund.isEligible ? '1px solid #dcfce7' : '1px solid #fed7aa' }}>
              <span style={{ color: '#64748b' }}>Eligible Refund Amount:</span>
              <strong style={{ color: refund.isProtected || refund.isEligible ? '#15803d' : '#991b1b', fontSize: '13px' }}>
                ₹{refund.refundAmount.toLocaleString('en-IN')} ({refund.percentage}%)
              </strong>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '6px',
              }}
            >
              Reason for Cancellation *
            </label>
            <select
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value);
                setValidationError('');
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                background: '#fff',
                color: '#0f172a',
              }}
            >
              {COMMON_BOOKING_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Comments */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '6px',
              }}
            >
              Additional Details {selectedReason === 'Other reason' && '*'}
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => {
                setComments(e.target.value);
                setValidationError('');
              }}
              placeholder="Provide any additional details or instructions..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: validationError ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            {validationError && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {validationError}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {refund.isBlocked ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                }}
              >
                Keep Reservation
              </button>
              <button
                type="button"
                onClick={handleContactSupport}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📞 Contact Support
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isCancelling}
                className="btn btn-secondary"
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                }}
              >
                Keep Reservation
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isCancelling}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  opacity: isCancelling ? 0.7 : 1,
                }}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
