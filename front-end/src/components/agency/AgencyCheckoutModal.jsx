import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsApi, bookingsApi, paymentsApi } from '../../services/api';

const CLOSED_BOOKING_STATUSES = ['CANCELLED', 'EXPIRED', 'REFUNDED'];
const PAID_BOOKING_STATUSES = ['PAID', 'CONFIRMED', 'COMPLETED'];

export default function AgencyCheckoutModal({
  isOpen,
  trip,
  booking: initialBooking = null,
  agencyCommissionRate = 1.5,
  onClose,
  onSuccess,
  showToast,
}) {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('Agency Escrow Account');
  const [processing, setProcessing] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const idempotencyRef = useRef('');

  useEffect(() => {
    if (!isOpen || !trip) return;
    setError(null);
    setReceipt(null);
    setProcessing(false);
    idempotencyRef.current = `agency-checkout-${trip.tripId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let cancelled = false;
    setCheckingExisting(true);
    const agencyId = Number(trip.agencyId || 1);

    bookingsApi
      .getByAgency(agencyId)
      .then(async (list) => {
        if (cancelled) return;
        const arr = Array.isArray(list) ? list : [];
        const activeBooking =
          initialBooking ||
          arr.find(
            (b) =>
              Number(b.tripId) === Number(trip.tripId) &&
              !CLOSED_BOOKING_STATUSES.includes(String(b.status || '').toUpperCase()),
          );

        if (activeBooking && PAID_BOOKING_STATUSES.includes(String(activeBooking.status || '').toUpperCase())) {
          const existingPayments = await paymentsApi.getByBooking(activeBooking.bookingId).catch(() => []);
          const paidPayment = Array.isArray(existingPayments)
            ? existingPayments.find((p) => String(p.status).toLowerCase() === 'paid')
            : null;
          if (!cancelled && paidPayment) {
            const latestTrip = await tripsApi.getById(trip.tripId).catch(() => trip);
            setReceipt({
              alreadyPaid: true,
              booking: activeBooking,
              payment: paidPayment,
              trip: latestTrip,
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingExisting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, trip?.tripId]);

  if (!isOpen || !trip) return null;

  const budget = Number(initialBooking?.amount ?? trip.budget) || 0;
  const commissionRate = Number(agencyCommissionRate ?? trip?.agencyCommissionRate ?? trip?.commissionRate ?? 1.5);
  const commissionAmount = Math.round((budget * commissionRate) / 100);
  const netPayable = budget - commissionAmount;

  const handleConfirmPayment = async () => {
    if (processing || receipt) return;
    setProcessing(true);
    setError(null);

    const agencyId = Number(trip.agencyId || 1);
    const attemptKey = idempotencyRef.current || `agency-checkout-${trip.tripId}`;

    try {
      // 1. Reconcile or create single authoritative unpaid Booking record (NEVER overwrite Confirmed booking)
      let targetBooking = initialBooking;
      if (!targetBooking) {
        const agencyBookings = await bookingsApi.getByAgency(agencyId);
        const list = Array.isArray(agencyBookings) ? agencyBookings : [];
        targetBooking = list.find(
          (b) =>
            Number(b.tripId) === Number(trip.tripId) &&
            !CLOSED_BOOKING_STATUSES.includes(String(b.status || '').toUpperCase()),
        );
      }

      if (targetBooking && PAID_BOOKING_STATUSES.includes(String(targetBooking.status || '').toUpperCase())) {
        const existingPayments = await paymentsApi.getByBooking(targetBooking.bookingId).catch(() => []);
        const paidPayment = Array.isArray(existingPayments)
          ? existingPayments.find((p) => String(p.status).toLowerCase() === 'paid')
          : null;
        if (paidPayment) {
          const latestTrip = await tripsApi.getById(trip.tripId).catch(() => trip);
          setReceipt({ alreadyPaid: true, booking: targetBooking, payment: paidPayment, trip: latestTrip });
          if (onSuccess) onSuccess(latestTrip, targetBooking);
          return;
        }
      }

      let bookingId = targetBooking?.bookingId;
      if (!bookingId) {
        const newBooking = await bookingsApi.create(
          {
            agencyId,
            tripId: Number(trip.tripId),
            service: trip.title || `Client Tour to ${trip.destination}`,
            type: 'Package',
            amount: budget,
            status: 'HELD',
            bookingDate: new Date().toISOString().split('T')[0],
          },
          { headers: { 'Idempotency-Key': `${attemptKey}-booking` } },
        );
        targetBooking = newBooking;
        bookingId = newBooking?.bookingId;
      }

      if (!bookingId) {
        throw new Error('Unable to create or locate booking record for this trip.');
      }

      // 2. Execute idempotent payment (server confirms booking AND transitions Planning/Pending trip -> Confirmed)
      const method = paymentMethod.includes('UPI')
        ? 'UPI'
        : paymentMethod.includes('Escrow')
          ? 'Cash'
          : 'Card';

      const paymentRecord = await paymentsApi.create(
        {
          agencyId,
          bookingId: Number(bookingId),
          amount: netPayable,
          paymentDate: new Date().toISOString().split('T')[0],
          method,
          status: 'Paid',
        },
        { headers: { 'Idempotency-Key': `${attemptKey}-payment` } },
      );

      // 3. Reconcile authoritative state from backend (NEVER issue blind Confirmed -> Pending transitions)
      const [latestBooking, latestTrip] = await Promise.all([
        bookingsApi.getById(bookingId).catch(() => ({ ...targetBooking, status: 'CONFIRMED' })),
        tripsApi.getById(trip.tripId).catch(() => ({ ...trip, status: 'Confirmed' })),
      ]);

      setReceipt({
        alreadyPaid: false,
        booking: latestBooking,
        payment: paymentRecord,
        trip: latestTrip,
      });

      if (showToast) {
        showToast(
          `Booking BK00${bookingId} confirmed & settled! Commission ₹${commissionAmount.toLocaleString('en-IN')} earned. ✓`,
        );
      }
      if (onSuccess) {
        onSuccess(latestTrip, latestBooking);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const msg = err.message || 'Settlement could not be completed. Please review and try again.';
      setError(msg);
    } finally {
      setProcessing(false);
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
          maxWidth: '520px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflowX: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
              Client Booking Checkout & Payment
            </h3>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              Confirm reservation & realize agency commission
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Trip Summary Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
              Trip #{trip.tripId}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {trip.title || trip.destination}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              📅 {trip.startDate} to {trip.endDate} · {trip.travelersCount || 1} {trip.travelersCount === 1 ? 'Passenger' : 'Passengers'}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
              <span>Gross Client Price:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{budget.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#166534' }}>
              <span>Agency Commission ({commissionRate}%):</span>
              <span style={{ fontWeight: 700 }}>+₹{commissionAmount.toLocaleString()}</span>
            </div>
            <div
              style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '15px',
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              <span>Net Platform Settlement:</span>
              <span style={{ color: '#0d9488' }}>₹{netPayable.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method Selector or Verified Receipt */}
          {checkingExisting ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Verifying existing reservation & payment state...
            </div>
          ) : receipt ? (
            <div>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#ecfdf5',
                  border: '1.5px solid #86efac',
                  marginBottom: '18px',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#065f46', marginBottom: '6px' }}>
                  {receipt.alreadyPaid ? '✓ Booking Already Settled' : '🎉 Payment & Booking Confirmed!'}
                </div>
                <div style={{ fontSize: '13px', color: '#047857', lineHeight: 1.5 }}>
                  <div><strong>Booking Reference:</strong> BK00{receipt.booking?.bookingId} ({receipt.booking?.status})</div>
                  <div><strong>Payment Reference:</strong> PAY-{receipt.payment?.paymentId} ({receipt.payment?.method} · {receipt.payment?.status})</div>
                  <div><strong>Trip Status:</strong> {receipt.trip?.status || 'Confirmed'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/agency/bookings?tripId=${trip.tripId}`);
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #0d9488',
                    background: '#f0fdfa',
                    color: '#0f766e',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🎫 View in Client Bookings
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0d9488',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  Select Sandbox Settlement Method (Demo Environment):
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { id: 'Agency Escrow Account', label: 'Agency Corporate Escrow (Sandbox Pre-approved Balance)' },
                    { id: 'Corporate Credit Card', label: 'Corporate Visa / MasterCard (Demo Sandbox)' },
                    { id: 'UPI & Instant NetBanking', label: 'Instant UPI / Corporate NetBanking (Demo Sandbox)' },
                  ].map((m) => (
                    <label
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: paymentMethod === m.id ? '2px solid #0d9488' : '1px solid #cbd5e1',
                        background: paymentMethod === m.id ? '#f0fdfa' : '#fff',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={m.id}
                        checked={paymentMethod === m.id}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{ accentColor: '#0d9488' }}
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={processing}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={processing}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: processing ? 'not-allowed' : 'pointer',
                    opacity: processing ? 0.7 : 1,
                  }}
                >
                  {processing ? 'Processing Settlement...' : `✓ Pay & Confirm Booking`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

