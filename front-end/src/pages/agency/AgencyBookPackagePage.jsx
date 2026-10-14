import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { packagesApi, passengersApi, tripsApi, bookingsApi } from '../../services/api';

/**
 * AgencyBookPackagePage
 * 
 * B2B Package Booking wizard for agency resellers.
 * Selects tour package and passenger, computes insurance & cancellation protections,
 * exposes transparent commission breakdown, and creates trips & bookings safely.
 */
export default function AgencyBookPackagePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPackageId = searchParams.get('packageId');
  const initialPassengerId = searchParams.get('passengerId');

  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);
  const commissionRate = Number(user?.commissionRate ?? 1.5);

  const [packages, setPackages] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form Fields
  const [selectedPkgId, setSelectedPkgId] = useState(initialPackageId ? String(initialPackageId) : '');
  const [selectedPassId, setSelectedPassId] = useState(initialPassengerId ? String(initialPassengerId) : '');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [transportMode, setTransportMode] = useState('Flight');
  const [cancellationProtection, setCancellationProtection] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [completedBooking, setCompletedBooking] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadResources = async () => {
      setLoading(true);
      setError(null);
      try {
        const [pkgsRes, passRes] = await Promise.allSettled([
          packagesApi.getAll(),
          passengersApi.getByAgency(agencyId),
        ]);

        if (!isMounted) return;

        if (pkgsRes.status === 'fulfilled' && Array.isArray(pkgsRes.value)) {
          setPackages(pkgsRes.value);
          if (!selectedPkgId && pkgsRes.value.length > 0) {
            setSelectedPkgId(String(pkgsRes.value[0].packageId || pkgsRes.value[0].id));
          }
        }
        if (passRes.status === 'fulfilled' && Array.isArray(passRes.value)) {
          setPassengers(passRes.value);
          if (!selectedPassId && passRes.value.length > 0) {
            setSelectedPassId(String(passRes.value[0].passId));
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load booking resources.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (agencyId) {
      loadResources();
    }
    return () => {
      isMounted = false;
    };
  }, [agencyId]);

  // Selected package details
  const selectedPackage = useMemo(() => {
    if (!selectedPkgId) return null;
    return packages.find((p) => String(p.packageId || p.id) === String(selectedPkgId));
  }, [packages, selectedPkgId]);

  // Selected passenger details
  const selectedPassenger = useMemo(() => {
    if (!selectedPassId) return null;
    return passengers.find((p) => String(p.passId) === String(selectedPassId));
  }, [passengers, selectedPassId]);

  // Calculate End Date
  const endDate = useMemo(() => {
    if (!startDate) return '';
    try {
      const d = new Date(startDate);
      const duration = selectedPackage?.duration ? parseInt(selectedPackage.duration, 10) : 5;
      d.setDate(d.getDate() + duration);
      return d.toISOString().split('T')[0];
    } catch {
      return startDate;
    }
  }, [startDate, selectedPackage]);

  // Pricing & Commission Breakdown
  const pricing = useMemo(() => {
    const basePrice = Number(selectedPackage?.price) || 0;
    const insuranceAmount = Math.round(basePrice * 0.07 * 100) / 100;

    let cancellationFee = 0;
    if (cancellationProtection) {
      if (transportMode === 'Flight') cancellationFee = 100;
      else if (transportMode === 'Bus') cancellationFee = 70;
      else if (transportMode === 'Train') cancellationFee = 50;
    }

    const totalAmount = basePrice + insuranceAmount + cancellationFee;
    const earnedCommission = Math.round(totalAmount * (commissionRate / 100) * 100) / 100;
    const netRemittance = totalAmount - earnedCommission;

    return {
      basePrice,
      insuranceAmount,
      cancellationFee,
      totalAmount,
      earnedCommission,
      netRemittance,
    };
  }, [selectedPackage, transportMode, cancellationProtection, commissionRate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPackage) {
      setSubmitError('Please select a tour package.');
      return;
    }
    if (!selectedPassenger) {
      setSubmitError('Please select a client passenger from your roster.');
      return;
    }
    if (!startDate) {
      setSubmitError('Please select a trip start date.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create or link trip for this agency booking
      const tripPayload = {
        agencyId,
        packageId: Number(selectedPackage.packageId || selectedPackage.id),
        destination: selectedPackage.destination || 'Global Destination',
        startDate,
        endDate,
        budget: pricing.totalAmount,
        status: 'Confirmed',
      };

      const trip = await tripsApi.create(tripPayload);
      const tripId = Number(trip.tripId || trip.id);

      // 2. Create client booking record
      const bookingPayload = {
        agencyId,
        tripId,
        service: `${selectedPackage.title} (${selectedPassenger.name})`,
        type: 'Package',
        amount: pricing.basePrice,
        status: 'Confirmed',
        bookingDate: new Date().toISOString().split('T')[0],
        transportMode,
        insuranceSelected: true,
        cancellationProtectionSelected: cancellationProtection,
        cancellationFee: pricing.cancellationFee,
        insuranceRate: 7,
        insuranceAmount: pricing.insuranceAmount,
      };

      const booking = await bookingsApi.create(bookingPayload);

      setCompletedBooking({
        bookingId: booking.bookingId || booking.id,
        tripId,
        passengerName: selectedPassenger.name,
        packageTitle: selectedPackage.title,
        amount: pricing.totalAmount,
        commission: pricing.earnedCommission,
      });
    } catch (err) {
      console.error('Agency booking error:', err);
      setSubmitError(err.message || 'Failed to complete booking. Please verify details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (completedBooking) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto' }}>
        <div className="card" style={{ padding: '36px', borderRadius: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Client Tour Booked Successfully!
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
            Booking reference <strong>BK00{completedBooking.bookingId}</strong> has been confirmed under Agency #{agencyId}.
          </p>

          <div
            style={{
              background: '#f0fdfc',
              border: '1px solid #99f6e4',
              borderRadius: '12px',
              padding: '18px',
              textAlign: 'left',
              marginBottom: '24px',
              fontSize: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Tour Package:</span>
              <span style={{ fontWeight: 700 }}>{completedBooking.packageTitle}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Client Passenger:</span>
              <span style={{ fontWeight: 700 }}>{completedBooking.passengerName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Total Billed:</span>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>${completedBooking.amount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #99f6e4' }}>
              <span style={{ color: '#0f766e', fontWeight: 700 }}>Reseller Earned Commission:</span>
              <span style={{ color: '#059669', fontWeight: 800, fontSize: '16px' }}>+${completedBooking.commission.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/agency/bookings')}
              className="btn btn-primary"
              style={{ background: '#19b6a6', border: 'none', padding: '10px 20px', fontWeight: 700 }}
            >
              View Client Bookings →
            </button>
            <button
              type="button"
              onClick={() => {
                setCompletedBooking(null);
                setSubmitError(null);
              }}
              className="btn btn-secondary"
              style={{ padding: '10px 18px' }}
            >
              Book Another Tour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Header */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfc 100%)',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Book Tour for Client Passenger 🛒
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Configure package travel dates, select passenger, and earn agency reseller commission.
          </p>
        </div>

        <Link to="/agency/packages" className="btn btn-secondary btn-sm">
          ← Back to Packages Catalog
        </Link>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {submitError && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {submitError}
        </div>
      )}

      {/* Main Wizard Form Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Form Column */}
        <div className="card" style={{ padding: '28px', borderRadius: '16px' }}>
          <form onSubmit={handleSubmit}>
            {/* Step 1: Package Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                1. Select Tour Package *
              </label>
              <select
                value={selectedPkgId}
                onChange={(e) => setSelectedPkgId(e.target.value)}
                className="form-control"
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              >
                {packages.map((pkg) => (
                  <option key={pkg.packageId || pkg.id} value={pkg.packageId || pkg.id}>
                    {pkg.title} — {pkg.destination} (${pkg.price}) [{pkg.duration} Days]
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Passenger Selection */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  2. Select Passenger from Roster *
                </label>
                <Link
                  to="/agency/passengers"
                  style={{ fontSize: '12px', color: '#19b6a6', fontWeight: 700, textDecoration: 'none' }}
                >
                  + Add New Passenger
                </Link>
              </div>

              {passengers.length === 0 ? (
                <div style={{ padding: '14px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', fontSize: '13px', color: '#92400e' }}>
                  No client passengers found in agency roster.{' '}
                  <Link to="/agency/passengers" style={{ color: '#b45309', fontWeight: 700 }}>
                    Click here to add a passenger
                  </Link>{' '}
                  before booking.
                </div>
              ) : (
                <select
                  value={selectedPassId}
                  onChange={(e) => setSelectedPassId(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  {passengers.map((p) => (
                    <option key={p.passId} value={p.passId}>
                      PAX#{p.passId}: {p.name} ({p.age} yrs, {p.gender})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Step 3: Travel Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Trip Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Calculated End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  disabled
                  className="form-control"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '14px' }}
                />
              </div>
            </div>

            {/* Step 4: Transport Mode & Protection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Transport Mode
              </label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                {['Flight', 'Train', 'Bus'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTransportMode(mode)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: transportMode === mode ? '2px solid #19b6a6' : '1px solid #cbd5e1',
                      background: transportMode === mode ? '#f0fdfc' : '#fff',
                      color: transportMode === mode ? '#0f766e' : '#374151',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {mode === 'Flight' ? '✈️ Flight' : mode === 'Train' ? '🚆 Train' : '🚌 Bus'}
                  </button>
                ))}
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={cancellationProtection}
                  onChange={(e) => setCancellationProtection(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#19b6a6' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Add Flexible Cancellation Protection
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {transportMode === 'Flight' ? '+$100 protection fee' : transportMode === 'Bus' ? '+$70 protection fee' : '+$50 protection fee'} (Allows penalty-free trip rescheduling)
                  </div>
                </div>
              </label>
            </div>

            {/* Simulated Payment Notice */}
            <div
              style={{
                padding: '12px 16px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#1e40af',
                marginBottom: '24px',
                lineHeight: '1.5',
              }}
            >
              💼 <strong>Corporate Partner Sandbox:</strong> This booking uses simulated partner credit lines. No real-time external card charge is incurred; booking is confirmed instantly into the master itinerary ledger.
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || passengers.length === 0}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #19b6a6 0%, #0ea5e9 100%)',
                border: 'none',
                borderRadius: '10px',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Confirming Tour Booking...' : `Confirm Client Booking ($${pricing.totalAmount.toFixed(2)}) →`}
            </button>
          </form>
        </div>

        {/* Right Financial & Commission Breakdown Card */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px', position: 'sticky', top: '24px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Financial & Commission Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Base Package Price:</span>
              <span style={{ fontWeight: 600 }}>${pricing.basePrice.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Travel Insurance (7% mandatory):</span>
              <span style={{ fontWeight: 600 }}>+${pricing.insuranceAmount.toFixed(2)}</span>
            </div>

            {cancellationProtection && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Cancellation Protection:</span>
                <span style={{ fontWeight: 600 }}>+${pricing.cancellationFee.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '16px', fontWeight: 800 }}>
              <span>Total Client Retail:</span>
              <span>${pricing.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Reseller Earnings Highlight Box */}
          <div
            style={{
              padding: '16px',
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
              Agency Earned Margin ({commissionRate}%)
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', margin: '6px 0' }}>
              +${pricing.earnedCommission.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#047857' }}>
              Credited directly to Agency #{agencyId} commission ledger upon booking confirmation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
