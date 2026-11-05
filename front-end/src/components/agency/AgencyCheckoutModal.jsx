import React, { useState } from 'react';
import { tripsApi, bookingsApi, paymentsApi } from '../../services/api';

export default function AgencyCheckoutModal({
  isOpen,
  trip,
  agencyCommissionRate = 1.5,
  onClose,
  onSuccess,
  showToast,
}) {
  if (!isOpen || !trip) return null;

  const [paymentMethod, setPaymentMethod] = useState('Agency Escrow Account');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const budget = Number(trip.budget) || 0;
  const commissionRate = Number(agencyCommissionRate) || 1.5;
  const commissionAmount = Math.round((budget * commissionRate) / 100);
  const netPayable = budget - commissionAmount;

  const handleConfirmPayment = async () => {
    setProcessing(true);
    setError(null);
    try {
      // 1. Transition trip status: Planning -> Pending -> Confirmed
      if (trip.status === 'Planning') {
        await tripsApi.updateStatus(trip.tripId, 'Pending');
      }
      const updated = await tripsApi.updateStatus(trip.tripId, 'Confirmed');

      // 2. Ensure Booking record exists and is Confirmed
      let bookingId;
      try {
        const agencyBookings = await bookingsApi.getByAgency(trip.agencyId || 1);
        const existingBooking = Array.isArray(agencyBookings)
          ? agencyBookings.find((b) => b.tripId === trip.tripId)
          : null;

        if (existingBooking) {
          await bookingsApi.update(existingBooking.bookingId, { status: 'Confirmed' });
          bookingId = existingBooking.bookingId;
        } else {
          const newBooking = await bookingsApi.create({
            agencyId: Number(trip.agencyId || 1),
            tripId: trip.tripId,
            service: trip.title || `Client Tour to ${trip.destination}`,
            type: 'Package',
            amount: budget,
            status: 'Confirmed',
            bookingDate: new Date().toISOString().split('T')[0],
          });
          bookingId = newBooking?.bookingId;
        }
      } catch (bErr) {
        console.warn('Booking record notice:', bErr);
      }

      // 3. Record Payment transaction
      try {
        const method = paymentMethod.includes('UPI') ? 'UPI' : paymentMethod.includes('Escrow') ? 'Cash' : 'Card';
        await paymentsApi.create({
          agencyId: Number(trip.agencyId || 1),
          ...(bookingId ? { bookingId: Number(bookingId) } : { tripId: Number(trip.tripId) }),
          amount: netPayable,
          paymentDate: new Date().toISOString().split('T')[0],
          method,
          status: 'Paid',
        });
      } catch (pErr) {
        console.warn('Payment record notice:', pErr);
      }

      if (showToast) {
        showToast(`Trip #${trip.tripId} confirmed & paid! Commission ₹${commissionAmount.toLocaleString()} earned. ✓`);
      }
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Payment processing failed. Please check status transition.');
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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
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

          {/* Payment Method Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
              Select Settlement Method:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'Agency Escrow Account', label: 'Agency Corporate Escrow (Pre-approved balance)' },
                { id: 'Corporate Credit Card', label: 'Corporate Visa / MasterCard' },
                { id: 'UPI & Instant NetBanking', label: 'Instant UPI / Corporate NetBanking' },
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
        </div>
      </div>
    </div>
  );
}

