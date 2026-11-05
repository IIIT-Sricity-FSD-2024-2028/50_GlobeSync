import React, { useState } from 'react';
import PassengerSelector from './PassengerSelector';
import AgencyTransportStep from './AgencyTransportStep';
import { tripsApi, bookingsApi, paymentsApi } from '../../services/api';

export default function AgencyResellModal({
  isOpen,
  pkg,
  agencyId,
  commissionRate = 10.0,
  onClose,
  onSuccess,
}) {
  if (!isOpen || !pkg) return null;

  const [step, setStep] = useState(1); // 1 = Dates & Passengers, 2 = Transport, 3 = Review & Submit

  // State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [selectedPassengerIds, setSelectedPassengerIds] = useState([]);
  const [origin, setOrigin] = useState('New Delhi, India');

  // Transport details
  const [transportType, setTransportType] = useState('Flight');
  const [carrier, setCarrier] = useState('');
  const [carrierPrice, setCarrierPrice] = useState(7800);
  const [lodgingTier, setLodgingTier] = useState('Deluxe');
  const [lodgingPrice, setLodgingPrice] = useState(27500);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const durationDays = Number(pkg.duration) || 5;

  const endDate = (() => {
    if (!startDate) return '';
    const d = new Date(startDate);
    d.setDate(d.getDate() + durationDays);
    return d.toISOString().split('T')[0];
  })();

  const numPassengers = Math.max(1, selectedPassengerIds.length);
  const packageBasePrice = Number(pkg.budget ?? pkg.price ?? 0);
  const totalPackageBase = packageBasePrice * numPassengers;
  const totalTransport = carrierPrice * numPassengers;
  const grossTotal = totalPackageBase + totalTransport;
  const commissionAmount = Math.round((grossTotal * Number(commissionRate)) / 100);
  const netPlatformPayable = grossTotal - commissionAmount;

  const pkgTitle = pkg.name || pkg.title || 'Curated Holiday Tour';
  const pkgDestination = pkg.destinations || pkg.destination || 'Global Tour';

  const handleSubmitResell = async () => {
    if (selectedPassengerIds.length === 0) {
      setError('Please select at least 1 passenger from your agency roster.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create agency-owned Trip
      const tripPayload = {
        agencyId: Number(agencyId),
        packageId: Number(pkg.packageId || pkg.id),
        title: `${pkgTitle} (Client Resell)`,
        origin: origin.trim() || 'New Delhi, India',
        destination: pkgDestination,
        startDate,
        endDate,
        budget: grossTotal,
        status: 'Confirmed',
        passengerIds: selectedPassengerIds,
        travelersCount: numPassengers,
        transportDetails: {
          transportType,
          carrier: carrier || 'Standard Operator',
          carrierPrice,
          lodgingTier,
        },
      };

      const createdTrip = await tripsApi.create(tripPayload);

      // 2. Create Booking record linked to this trip and agency
      const bookingPayload = {
        agencyId: Number(agencyId),
        tripId: createdTrip.tripId,
        service: `${pkgTitle} — Wholesale Resell`,
        amount: grossTotal,
        status: 'Confirmed',
        type: 'Package',
        bookingDate: new Date().toISOString().split('T')[0],
      };

      const createdBooking = await bookingsApi.create(bookingPayload);

      // 3. Record corporate payment transaction
      try {
        const bId = Number(createdBooking?.bookingId || createdBooking?.id);
        await paymentsApi.create({
          agencyId: Number(agencyId),
          ...(bId ? { bookingId: bId } : { tripId: Number(createdTrip.tripId) }),
          amount: netPlatformPayable,
          paymentDate: new Date().toISOString().split('T')[0],
          method: 'Card',
          status: 'Paid',
        });
      } catch (pErr) {
        console.warn('Payment record notice:', pErr);
      }

      if (onSuccess) {
        onSuccess(createdTrip, commissionAmount);
      }
      onClose();
    } catch (err) {
      console.error('Failed to resell package:', err);
      setError(err.message || 'Failed to complete client package resell.');
    } finally {
      setSubmitting(false);
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
        padding: '20px',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
              Resell Package to Client: {pkgTitle}
            </h3>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              📍 {pkgDestination} · {durationDays} Days · Retail ₹{packageBasePrice.toLocaleString('en-IN')} / person
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

        {/* Steps Tab Indicators */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px', background: '#f8fafc' }}>
          {[
            { id: 1, label: '1. Dates & Passengers' },
            { id: 2, label: '2. Transport Preferences' },
            { id: 3, label: '3. Pricing & Commission Review' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setStep(t.id)}
              style={{
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: step === t.id ? '2px solid #0d9488' : '2px solid transparent',
                fontWeight: step === t.id ? 800 : 600,
                color: step === t.id ? '#0d9488' : '#64748b',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              ⚠️ {error}
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Departure City (From)
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. New Delhi, India"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Tour Departure Date (Start)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                    Returns on: {endDate} ({durationDays} days)
                  </span>
                </div>
              </div>

              <PassengerSelector
                agencyId={agencyId}
                selectedPassengerIds={selectedPassengerIds}
                onSelectPassengers={setSelectedPassengerIds}
                onChange={setSelectedPassengerIds}
              />
            </div>
          )}

          {step === 2 && (
            <AgencyTransportStep
              origin={origin}
              destination={pkgDestination}
              transportType={transportType}
              carrier={carrier}
              carrierPrice={carrierPrice}
              lodgingTier={lodgingTier}
              lodgingPrice={lodgingPrice}
              passengerCount={numPassengers}
              stayDays={durationDays}
              onChange={(details) => {
                if (details.transportType) setTransportType(details.transportType);
                if (details.carrier !== undefined) setCarrier(details.carrier);
                if (details.carrierPrice !== undefined) setCarrierPrice(details.carrierPrice);
                if (details.lodgingTier !== undefined) setLodgingTier(details.lodgingTier);
                if (details.lodgingPrice !== undefined) setLodgingPrice(details.lodgingPrice);
              }}
              onTransportChange={(details) => {
                if (details.transportType) setTransportType(details.transportType);
                if (details.carrier !== undefined) setCarrier(details.carrier);
                if (details.carrierPrice !== undefined) setCarrierPrice(details.carrierPrice);
                if (details.lodgingTier !== undefined) setLodgingTier(details.lodgingTier);
                if (details.lodgingPrice !== undefined) setLodgingPrice(details.lodgingPrice);
              }}
            />
          )}

          {step === 3 && (
            <div>
              <div
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  marginBottom: '20px',
                }}
              >
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Financial Breakdown & Margin Summary
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Package Retail Cost (₹{packageBasePrice.toLocaleString('en-IN')} × {numPassengers} pax):</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{totalPackageBase.toLocaleString('en-IN')}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Transit Option ({transportType} · {carrier || 'Selected'} × {numPassengers} pax):</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{totalTransport.toLocaleString('en-IN')}</span>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    <span>Total Client Gross Amount:</span>
                    <span style={{ color: '#0d9488' }}>₹{grossTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Commission Highlight Box */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: '12px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                    Agency Reseller Margin ({commissionRate}%)
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                    +₹{commissionAmount.toLocaleString('en-IN')}
                  </div>
                  <span style={{ fontSize: '12px', color: '#166534' }}>
                    Directly recorded to your Commission Ledger upon reservation.
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Net to Platform</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    ₹{netPlatformPayable.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#0d9488',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitResell}
                disabled={submitting}
                style={{
                  padding: '8px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Confirming Resell...' : 'Confirm & Earn Commission'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
