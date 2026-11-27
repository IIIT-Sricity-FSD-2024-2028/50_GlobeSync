import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';

const COMMON_REASONS = [
  'Change of travel plans',
  'Medical or personal emergency',
  'Found a better alternative / pricing',
  'Work or schedule conflict',
  'Weather or destination safety concerns',
  'Other reason',
];

export default function TripCancelModal({
  isOpen,
  trip,
  onClose,
  onConfirm,
  isCancelling = false,
  error = null,
}) {
  if (!isOpen || !trip) return null;

  const navigate = useNavigate();
  const { role } = useSession();
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [comments, setComments] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleContactSupport = () => {
    const supportPath = role === 'agency' ? '/agency/support' : '/traveler/support';
    const params = new URLSearchParams();
    params.set('tripId', String(trip.tripId || trip.id));
    params.set('issueType', 'Cancellation Assistance');
    if (selectedReason) params.set('reason', selectedReason);
    if (comments.trim()) params.set('notes', comments.trim());
    onClose();
    navigate(`${supportPath}?${params.toString()}`);
  };

  // ── Cancellation Policy Calculation (3-Day & 12-Hour Cutoff Rules) ──────
  // Rules:
  // 1. Within 12 hours of departure (hoursUntil < 12): Cancellation is locked / blocked.
  // 2. Before 12 hours but less than 3 days (12 <= hoursUntil and daysUntil < 3): Can cancel, but 0% refund.
  // 3. Before 3 days (daysUntil >= 3 / hoursUntil >= 72): Can cancel, 65% refund (35% deduction).
  const getRefundPolicy = () => {
    if (!trip.startDate) {
      return { hoursUntil: 999, daysUntil: 30, percentage: 65, isBlocked: false, isEligible: true, budget: Number(trip.budget) || 0, refundAmount: Math.round((Number(trip.budget) || 0) * 0.65), penaltyAmount: Math.round((Number(trip.budget) || 0) * 0.35) };
    }

    const now = new Date();
    const tripStart = new Date(trip.startDate.includes('T') ? trip.startDate : `${trip.startDate}T00:00:00`);

    const diffMs = tripStart.getTime() - now.getTime();
    const hoursUntil = Math.round(diffMs / (1000 * 60 * 60));
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const isBlocked = hoursUntil < 12;
    const isEligible = !isBlocked && daysUntil >= 3;
    const percentage = isBlocked ? 0 : isEligible ? 65 : 0;
    const budget = Number(trip.budget) || 0;
    const refundAmount = Math.round(budget * (percentage / 100));
    const penaltyAmount = budget - refundAmount;

    return { hoursUntil, daysUntil, percentage, isBlocked, isEligible, budget, refundAmount, penaltyAmount };
  };

  const refund = getRefundPolicy();

  const handleConfirm = () => {
    if (refund.isBlocked) {
      setValidationError('Cancellation window has closed. Trips cannot be cancelled within 12 hours of departure.');
      return;
    }
    if (!selectedReason) {
      setValidationError('Please select a reason for cancellation.');
      return;
    }
    if (selectedReason === 'Other reason' && !comments.trim()) {
      setValidationError('Please provide more details in the comments field.');
      return;
    }

    const refundTag = refund.isEligible
      ? '[65% Refund - Cancelled ≥3 days before trip]'
      : '[0% Refund - Cancelled before 12h cutoff (No refund)]';

    const finalReason = comments.trim()
      ? `${selectedReason}: ${comments.trim()} ${refundTag}`
      : `${selectedReason} ${refundTag}`;

    onConfirm(trip, finalReason);
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
              Cancel Trip Itinerary
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#7f1d1d' }}>
              Trip #{trip.tripId || trip.id} &bull; {trip.destination} ({trip.startDate} → {trip.endDate})
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

          <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
            Are you sure you want to cancel your trip to <strong>{trip.destination}</strong>?
            Please review the cancellation refund terms below and provide your cancellation reason.
          </p>

          {/* 3-Day & 12-Hour Cancellation Policy Breakdown */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: refund.isBlocked
                ? '1px solid #fecaca'
                : refund.isEligible
                ? '1px solid #bbf7d0'
                : '1px solid #fed7aa',
              background: refund.isBlocked
                ? '#fef2f2'
                : refund.isEligible
                ? '#f0fdf4'
                : '#fff7ed',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 9px',
                  borderRadius: '20px',
                  background: refund.isBlocked
                    ? '#fee2e2'
                    : refund.isEligible
                    ? '#dcfce7'
                    : '#ffedd5',
                  color: refund.isBlocked
                    ? '#991b1b'
                    : refund.isEligible
                    ? '#15803d'
                    : '#c2410c',
                  letterSpacing: '0.5px',
                }}
              >
                {refund.isBlocked
                  ? '🛑 Cancellation Closed (<12h)'
                  : refund.isEligible
                  ? '🟢 65% Refund Eligible (Cancelled ≥3 Days in Advance)'
                  : '⚠️ Permitted (0% Refund — Before 12h Cutoff)'}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                {refund.hoursUntil > 0
                  ? refund.daysUntil > 2
                    ? `Departure in ${refund.daysUntil} days`
                    : `Departure in ${refund.hoursUntil} hours`
                  : 'Departure imminent'}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: refund.isBlocked ? '#991b1b' : refund.isEligible ? '#166534' : '#9a3412', lineHeight: 1.45 }}>
              {refund.isBlocked ? (
                <>
                  <strong>Cancellation window has closed.</strong> Trips cannot be cancelled within 12 hours of departure. At this stage, platform guides, tickets, and bookings are completely locked. Please contact our 24/7 Support Team if you have an urgent emergency.
                </>
              ) : refund.isEligible ? (
                <>
                  You are cancelling <strong>before 3 days</strong> of departure (≥3 days notice). Under GlobeSync cancellation policy, you are eligible for a <strong>65% refund</strong> of your trip amount (35% cancellation deduction).
                </>
              ) : (
                <>
                  You are cancelling <strong>before the 12-hour departure cutoff</strong>, but less than 3 days in advance. You may cancel your trip itinerary, but per policy <strong>no refund will be issued (0% refund)</strong>.
                </>
              )}
            </p>

            {/* Financial Breakdown */}
            <div
              style={{
                marginTop: '4px',
                paddingTop: '10px',
                borderTop: refund.isBlocked
                  ? '1px solid #fee2e2'
                  : refund.isEligible
                  ? '1px solid #dcfce7'
                  : '1px solid #fed7aa',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Trip Budget:</span>
                <strong style={{ color: '#0f172a' }}>₹{refund.budget.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Cancellation Deduction:</span>
                <strong style={{ color: refund.isEligible ? '#ea580c' : '#dc2626' }}>
                  {refund.isEligible ? `- ₹${refund.penaltyAmount.toLocaleString('en-IN')} (35%)` : `- ₹${refund.budget.toLocaleString('en-IN')} (100%)`}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Eligible Refund:</span>
                <strong style={{ color: refund.isEligible ? '#15803d' : '#991b1b', fontSize: '14px' }}>
                  ₹{refund.refundAmount.toLocaleString('en-IN')} ({refund.percentage}%)
                </strong>
              </div>
            </div>
          </div>

          {/* Reason Select */}
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
              {COMMON_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Explanation */}
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
              Additional Comments / Feedback {selectedReason === 'Other reason' && '*'}
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => {
                setComments(e.target.value);
                setValidationError('');
              }}
              placeholder="Please elaborate on your cancellation reason..."
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

          {/* Policy Callout */}
          <div
            style={{
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#64748b',
              lineHeight: 1.4,
            }}
          >
            ℹ️ <strong>Cancellation Notice:</strong> Holding reservations and assigned guides will be released. If you have bookings protected by cancellation insurance, you may request refunds in your Bookings portal.
          </div>
        </div>

        {/* Action Buttons */}
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
                Keep Itinerary
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
                Keep Itinerary
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
