import React, { useState } from 'react';
import PassengerSelector from './PassengerSelector';
import AgencyTransportStep from './AgencyTransportStep';
import AgencyItineraryBuilder from './AgencyItineraryBuilder';
import AgencyFinancialSummary from './AgencyFinancialSummary';
import { tripsApi, bookingsApi } from '../../services/api';
import {
  TRIP_DATE_POLICY,
  getBookingDateBounds,
  getMaxCustomEndDate,
  getInclusiveDurationDays,
  validateTripDateRange,
} from '../../config/tripDatePolicy';
import { getRouteTransportCatalog } from '../trips/tripCalculations';

const STEPS = [
  { step: 1, title: 'Basics & Passengers', desc: 'Destination, dates & client roster' },
  { step: 2, title: 'Transit & Lodging', desc: 'Modes, carriers & hotel tier' },
  { step: 3, title: 'Daily Schedule', desc: 'Day-by-day plan & guide request' },
  { step: 4, title: 'Summary & Confirm', desc: 'Commission preview & submission' },
];

export default function AgencyCreateTripWizard({
  agencyId,
  commissionRate = 10.0,
  onSuccess,
  onCancel,
  showToast,
}) {
  const [currentStep, setCurrentStep] = useState(1);

  // Controlled Form State
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('New Delhi, India');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 19);
    return d.toISOString().split('T')[0];
  });
  const [baseBudget, setBaseBudget] = useState('45000');
  const [selectedPassengerIds, setSelectedPassengerIds] = useState([]);
  const [category, setCategory] = useState('Family Vacation');
  const [notes, setNotes] = useState('');

  // Transport & Lodging State
  const [transportType, setTransportType] = useState('Flight');
  const [carrier, setCarrier] = useState(() => {
    const opts = getRouteTransportCatalog('Flight', 'New Delhi, India', '');
    return opts[0]?.name || 'SkyHigh Airlines';
  });
  const [carrierPrice, setCarrierPrice] = useState(7800);
  const [lodgingTier, setLodgingTier] = useState('Deluxe');
  const [lodgingPrice, setLodgingPrice] = useState(27500); // 5 nights @ 5500

  // Itinerary & Guide State
  const [itineraryDays, setItineraryDays] = useState([]);
  const [guideRequested, setGuideRequested] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState('');

  // Validation & Submission
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const stayDays = Math.max(1, getInclusiveDurationDays(startDate, endDate) - 1);
  const inclusiveDays = getInclusiveDurationDays(startDate, endDate);
  const { minStartDate: tomorrowStr, maxHorizonDate } = getBookingDateBounds();
  const minEndDateStr = startDate || tomorrowStr;
  const maxEndDateStr = getMaxCustomEndDate(startDate);

  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!title.trim()) errs.title = 'Trip title is required';
      if (!destination.trim()) errs.destination = 'Destination is required';
      const dateErrs = validateTripDateRange({
        startDate,
        endDate,
        isPackage: false,
      });
      Object.assign(errs, dateErrs);
      if (baseBudget !== '' && baseBudget !== null && baseBudget !== undefined) {
        const bNum = parseFloat(baseBudget);
        if (isNaN(bNum) || bNum < 0) {
          errs.baseBudget = 'Please enter a valid target budget amount (or leave blank)';
        }
      }
      if (selectedPassengerIds.length === 0) {
        errs.passengers = 'Please select at least 1 passenger from your roster (or add one inline)';
      }
    }
    if (step === 2) {
      if (!transportType || !carrier) {
        errs.transport = 'Transportation operator selection is mandatory.';
      }
      if (startDate !== endDate && !lodgingTier) {
        errs.lodging = 'Accommodation tier is mandatory for overnight trips.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const numPassengers = Math.max(1, selectedPassengerIds.length);
    const totalTransport = carrierPrice * numPassengers;
    const totalLodging = lodgingPrice * numPassengers;
    const totalGuide = guideRequested ? 1500 : 0;
    const targetBudget = Number(baseBudget) || 0;
    // Final Billable Client Price equals ONLY selected billable services
    const grossTotal = totalTransport + totalLodging + totalGuide;

    try {
      const payload = {
        agencyId: Number(agencyId),
        travelerId: undefined,
        title: title.trim(),
        origin: origin.trim() || 'New Delhi, India',
        destination: destination.trim(),
        startDate,
        endDate,
        budget: grossTotal,
        targetBudget: targetBudget,
        status: 'Planning',
        guideId: guideRequested && selectedGuideId ? Number(selectedGuideId) : undefined,
        passengerIds: selectedPassengerIds,
        travelersCount: numPassengers,
        category,
        notes: notes.trim() || undefined,
        transportDetails: {
          transportType,
          carrier: carrier || 'Standard Operator',
          carrierPrice,
          lodgingTier,
          lodgingPrice,
        },
        itineraryDays,
      };

      const newTrip = await tripsApi.create(payload);
      try {
        await bookingsApi.create({
          agencyId: Number(agencyId),
          tripId: newTrip.tripId,
          service: newTrip.title || `Client Tour to ${newTrip.destination}`,
          type: 'Custom Tour',
          amount: grossTotal,
          status: 'Pending',
          bookingDate: new Date().toISOString().split('T')[0],
        });
      } catch (bErr) {
        console.warn('Could not auto-create booking record for trip:', bErr);
      }
      if (showToast) {
        showToast(`Client trip "${newTrip.title || newTrip.destination}" created successfully! ✓`);
      }
      if (onSuccess) {
        onSuccess(newTrip);
      }
    } catch (err) {
      console.error('Trip creation failed:', err);
      setSubmitError(err.message || 'Failed to create trip. Please verify inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px 28px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      {/* Wizard Progress Steps Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))',
          gap: '12px',
          marginBottom: '28px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '20px',
        }}
      >
        {STEPS.map((s) => {
          const isActive = currentStep === s.step;
          const isPassed = currentStep > s.step;
          return (
            <div
              key={s.step}
              onClick={() => {
                if (isPassed) setCurrentStep(s.step);
              }}
              style={{
                cursor: isPassed ? 'pointer' : 'default',
                opacity: currentStep >= s.step ? 1 : 0.6,
                borderLeft: isActive ? '3px solid #0d9488' : isPassed ? '3px solid #10b981' : '3px solid #cbd5e1',
                paddingLeft: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: isActive ? '#0d9488' : isPassed ? '#10b981' : '#cbd5e1',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isPassed ? '✓' : s.step}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  {s.title}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', paddingLeft: '26px' }}>
                {s.desc}
              </div>
            </div>
          );
        })}
      </div>

      {submitError && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px', fontSize: '13px', marginBottom: '20px' }}>
          ⚠️ {submitError}
        </div>
      )}

      {/* STEP 1: Basics & Passengers */}
      {currentStep === 1 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Step 1: Client & Trip Basics + Passenger Roster
          </h3>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
            Define client trip details, destination, dates, and pick passengers from your agency roster.
          </p>

          <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                Trip Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sharma Family Swiss Alps Winter Getaway"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: errors.title ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              {errors.title && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.title}</span>}
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                Destination (City, Country) *
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Zurich & Lucerne, Switzerland"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: errors.destination ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              {errors.destination && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.destination}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                Departure City (From)
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. New Delhi, India"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                Start Date * (Horizon: {TRIP_DATE_POLICY.MAX_BOOKING_HORIZON_DAYS}d)
              </label>
              <input
                type="date"
                min={tomorrowStr}
                max={maxHorizonDate}
                value={startDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setStartDate(v);
                  const maxEnd = getMaxCustomEndDate(v);
                  if (endDate && (endDate < v || endDate > maxEnd)) {
                    setEndDate('');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: errors.startDate ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              {errors.startDate && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.startDate}</span>}
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                End Date * (Max {TRIP_DATE_POLICY.MAX_CUSTOM_DURATION_DAYS}d)
              </label>
              <input
                type="date"
                min={minEndDateStr}
                max={maxEndDateStr}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: errors.endDate ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              {inclusiveDays > 0 && (
                <span style={{ fontSize: '11px', color: '#0f766e', marginTop: '3px', display: 'block', fontWeight: 600 }}>
                  Duration: {inclusiveDays} Calendar Day{inclusiveDays !== 1 ? 's' : ''} ({stayDays} Night{stayDays !== 1 ? 's' : ''})
                </span>
              )}
              {errors.endDate && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.endDate}</span>}
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                Client Target Budget (₹)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={baseBudget}
                onChange={(e) => setBaseBudget(e.target.value)}
                placeholder="e.g. 45000 (Optional reference cap)"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: errors.baseBudget ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                Optional reference budget (not added as a billable charge).
              </span>
              {errors.baseBudget && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.baseBudget}</span>}
            </div>
          </div>

          {/* Passenger Selector */}
          <PassengerSelector
            agencyId={agencyId}
            selectedPassengerIds={selectedPassengerIds}
            onSelectPassengers={(ids) => setSelectedPassengerIds(ids)}
            onChange={(ids) => setSelectedPassengerIds(ids)}
          />
          {errors.passengers && (
            <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px', display: 'block' }}>
              ⚠️ {errors.passengers}
            </span>
          )}
        </div>
      )}

      {/* STEP 2: Transit & Lodging */}
      {currentStep === 2 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Step 2: Transport & Lodging Selection
          </h3>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
            Select transport modes, dynamic route-calibrated operators, and accommodation tiers.
          </p>

          <AgencyTransportStep
            origin={origin}
            destination={destination}
            transportType={transportType}
            carrier={carrier}
            carrierPrice={carrierPrice}
            lodgingTier={lodgingTier}
            passengerCount={selectedPassengerIds.length}
            stayDays={stayDays}
            onChange={(patch) => {
              if (patch.transportType !== undefined) setTransportType(patch.transportType);
              if (patch.carrier !== undefined) setCarrier(patch.carrier);
              if (patch.carrierPrice !== undefined) setCarrierPrice(patch.carrierPrice);
              if (patch.lodgingTier !== undefined) setLodgingTier(patch.lodgingTier);
              if (patch.lodgingPrice !== undefined) setLodgingPrice(patch.lodgingPrice);
            }}
          />
        </div>
      )}

      {/* STEP 3: Daily Schedule & Guide */}
      {currentStep === 3 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Step 3: Day-by-Day Itinerary Builder & Guide Request
          </h3>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
            Customize morning, afternoon, and evening activities with meal plans and coordinate guide requests.
          </p>

          <AgencyItineraryBuilder
            startDate={startDate}
            endDate={endDate}
            itineraryDays={itineraryDays}
            onDaysChange={(newDays) => setItineraryDays(newDays)}
            guideRequested={guideRequested}
            onGuideRequestToggle={(val) => setGuideRequested(val)}
            selectedGuideId={selectedGuideId}
            onGuideChange={(id) => setSelectedGuideId(id)}
          />
        </div>
      )}

      {/* STEP 4: Financial Summary & Confirmation */}
      {currentStep === 4 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Step 4: Financial Summary, Live Commission Preview & Submission
          </h3>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
            Review complete itemized client quotation, live agency reseller commission, and record client trip.
          </p>

          <AgencyFinancialSummary
            baseBudget={Number(baseBudget)}
            transportType={transportType}
            carrier={carrier}
            carrierPrice={carrierPrice}
            lodgingTier={lodgingTier}
            lodgingPrice={lodgingPrice}
            guideRequested={guideRequested}
            guideFee={1500}
            passengerCount={selectedPassengerIds.length}
            stayDays={stayDays}
            agencyCommissionRate={commissionRate}
            title={title}
            destination={destination}
            category={category}
            notes={notes}
            onNotesChange={(val) => setNotes(val)}
            onCategoryChange={(val) => setCategory(val)}
          />
        </div>
      )}

      {/* Navigation Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '32px',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '20px',
        }}
      >
        <div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#334155',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                background: '#0d9488',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Next: {STEPS[currentStep].title} →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '14px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(13,148,136,0.3)',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Creating Client Trip & Ledger...' : '🚀 Submit & Confirm Client Trip'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

