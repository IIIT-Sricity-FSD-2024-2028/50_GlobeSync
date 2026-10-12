import React from 'react';
import PlanningModeSelect from './PlanningModeSelect';
import TransportSelectStep from './TransportSelectStep';
import HotelSelectStep from './HotelSelectStep';
import GuideSelectStep from './GuideSelectStep';
import TripCostSummary from './TripCostSummary';

const STEPS = [
  { id: 0, title: 'Planning Mode', icon: '🎯' },
  { id: 1, title: 'Dates & Travelers', icon: '📅' },
  { id: 2, title: 'Destination', icon: '📍' },
  { id: 3, title: 'Transport', icon: '🚆' },
  { id: 4, title: 'Stay', icon: '🏨' },
  { id: 5, title: 'Guide', icon: '👤' },
  { id: 6, title: 'Review & Confirm', icon: '✓' },
];

/**
 * TripForm: Controlled step-by-step form for traveler trip creation
 */
export default function TripForm({
  currentStep,
  formData,
  errors = {},
  packages = [],
  guides = [],
  loadingGuides = false,
  costData,
  isSubmitting = false,
  onStepChange,
  onStepAdvance,
  onInputChange,
  onSelectPackage,
  onCarrierSelect,
  onHotelSelect,
  onGuideSelect,
  onSubmit,
}) {
  // Named event handler for advancing to next step with validation
  const handleNextStep = () => {
    if (onStepAdvance) {
      onStepAdvance();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Visual Stepper */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          borderRadius: '16px',
          marginBottom: '24px',
          background: '#fff',
          border: '1px solid var(--border)',
          overflowX: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: '600px' }}>
          {STEPS.map((s, index) => {
            const isActive = currentStep === s.id;
            const isCompleted = currentStep > s.id;
            return (
              <React.Fragment key={s.id}>
                <div
                  onClick={() => isCompleted && onStepChange(s.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: isCompleted ? 'pointer' : 'default',
                    opacity: isActive || isCompleted ? 1 : 0.45,
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isCompleted ? 'var(--success, #10b981)' : isActive ? 'var(--primary)' : '#f1f5f9',
                      color: isActive || isCompleted ? '#fff' : 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      fontWeight: 700,
                      marginBottom: '4px',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isCompleted ? '✓' : s.icon}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.title}
                  </div>
                </div>

                {index < STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      background: currentStep > s.id ? 'var(--success, #10b981)' : 'var(--border)',
                      margin: '0 8px',
                      marginBottom: '16px',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Step Content & Cost Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        {/* Step Panels */}
        <div
          className="card"
          style={{
            padding: '28px',
            borderRadius: '16px',
            background: '#fff',
            border: '1px solid var(--border)',
            minHeight: '400px',
          }}
        >
          {/* STEP 0: Mode Selection */}
          {currentStep === 0 && (
            <div>
              <PlanningModeSelect
                selectedMode={formData.mode}
                onSelectMode={(mode) => {
                  onInputChange('mode', mode);
                  if (mode === 'custom') {
                    onStepChange(1);
                  }
                }}
              />

              {/* If Package mode is chosen, list available packages to choose from */}
              {formData.mode === 'package' && (
                <div style={{ marginTop: '28px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
                    Select a Base Package
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {packages.map((pkg) => (
                      <div
                        key={pkg.packageId}
                        onClick={() => onSelectPackage(pkg)}
                        style={{
                          padding: '16px',
                          border: `1.5px solid ${formData.packageId === pkg.packageId ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: '12px',
                          background: formData.packageId === pkg.packageId ? '#ffeef5' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700 }}>{pkg.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                            📍 {pkg.destinations} • ⏱ {pkg.duration} Days
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                            ₹{Number(pkg.budget).toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {formData.packageId === pkg.packageId ? '✓ Selected' : 'Choose Package →'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 1: Dates & Travelers */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
                Trip Schedule & Passenger Count
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
                Specify travel dates and group size. End date must be strictly after start date.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => onInputChange('startDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.startDate ? 'var(--danger, #ef4444)' : 'var(--border)'}`,
                      fontSize: '14px',
                    }}
                  />
                  {errors.startDate && (
                    <div style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', marginTop: '4px' }}>
                      {errors.startDate}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => onInputChange('endDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.endDate ? 'var(--danger, #ef4444)' : 'var(--border)'}`,
                      fontSize: '14px',
                    }}
                  />
                  {errors.endDate && (
                    <div style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', marginTop: '4px' }}>
                      {errors.endDate}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Number of Persons *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.numPersons}
                  onChange={(e) => onInputChange('numPersons', Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.numPersons ? 'var(--danger, #ef4444)' : 'var(--border)'}`,
                    fontSize: '14px',
                  }}
                />
                {errors.numPersons && (
                  <div style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', marginTop: '4px' }}>
                    {errors.numPersons}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Locations & Destination */}
          {currentStep === 2 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
                Destination & Starting Point
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
                Enter your departure location and target destination city.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Primary Destination *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paris, France or Tokyo, Japan"
                  value={formData.destination}
                  onChange={(e) => onInputChange('destination', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.destination ? 'var(--danger, #ef4444)' : 'var(--border)'}`,
                    fontSize: '14px',
                  }}
                />
                {errors.destination && (
                  <div style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', marginTop: '4px' }}>
                    {errors.destination}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Departure / Starting City (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. New Delhi, Mumbai, Bengaluru"
                  value={formData.currentLocation}
                  onChange={(e) => onInputChange('currentLocation', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Transport Selection */}
          {currentStep === 3 && (
            <TransportSelectStep
              transportType={formData.transportType}
              tripType={formData.tripType}
              selectedCarrier={formData.transportName}
              includeProtection={formData.includeCancellationProtection}
              onTransportTypeChange={(type) => onInputChange('transportType', type)}
              onTripTypeChange={(type) => onInputChange('tripType', type)}
              onCarrierSelect={onCarrierSelect}
              onProtectionToggle={(checked) => onInputChange('includeCancellationProtection', checked)}
            />
          )}

          {/* STEP 4: Accommodation Selection */}
          {currentStep === 4 && (
            <HotelSelectStep
              destination={formData.destination}
              selectedHotel={formData.hotelName}
              onHotelSelect={onHotelSelect}
            />
          )}

          {/* STEP 5: Travel Guide Selection */}
          {currentStep === 5 && (
            <GuideSelectStep
              guides={guides}
              loading={loadingGuides}
              selectedGuideId={formData.guideId}
              onGuideSelect={onGuideSelect}
            />
          )}

          {/* STEP 6: Review & Final Confirmation */}
          {currentStep === 6 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
                Review Itinerary Details
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
                Please review your travel plan and estimated budget before submitting to the backend.
              </p>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '18px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '13px',
                }}
              >
                <div><strong>Planning Mode:</strong> {formData.mode === 'package' ? `Pre-Planned Package #${formData.packageId}` : 'Custom Itinerary (No Package ID)'}</div>
                <div><strong>Destination:</strong> {formData.destination}</div>
                <div><strong>Departure City:</strong> {formData.currentLocation || 'Self-Arranged'}</div>
                <div><strong>Travel Dates:</strong> {formData.startDate} → {formData.endDate} ({costData.days} Days)</div>
                <div><strong>Passengers:</strong> {formData.numPersons} Traveler(s)</div>
                <div>
                  <strong>Transit Operator:</strong> {formData.transportName || 'None'} ({formData.transportType}, {formData.tripType === 'round' ? 'Round Trip' : 'One Way'} × {formData.numPersons}) — ₹{(costData.transportCost || 0).toLocaleString('en-IN')}
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '6px' }}>(Simulated Rate)</span>
                </div>
                {costData.insuranceCost > 0 && (
                  <div style={{ color: '#047857' }}>
                    <strong>Compulsory Travel Insurance (7%):</strong> ₹{Math.round(costData.insuranceCost).toLocaleString('en-IN')} (Persisted in Transport Booking)
                  </div>
                )}
                {costData.cancellationFee > 0 && (
                  <div style={{ color: '#047857' }}>
                    <strong>Flexible Cancellation Protection:</strong> ₹{costData.cancellationFee} (Persisted in Transport Booking)
                  </div>
                )}
                <div>
                  <strong>Accommodation:</strong> {formData.hotelName ? `${formData.hotelName} (${costData.days} nights × ${formData.numPersons}) — ₹${(costData.hotelCost || 0).toLocaleString('en-IN')}` : 'Self-Arranged Accommodation (₹0)'}
                  {formData.hotelName && <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '6px' }}>(Simulated Tier)</span>}
                </div>
                <div>
                  <strong>Assigned Tour Guide:</strong> {formData.guideName ? `${formData.guideName} (Guide #${formData.guideId}) — ₹${(costData.guideCost || 0).toLocaleString('en-IN')}` : 'Self-Guided Tour (₹0)'}
                </div>
                <div>
                  <strong>Platform Coordination Fee:</strong> ₹{costData.platformFee} <span style={{ fontSize: '11px', color: 'var(--muted)' }}>(Estimated planning fee)</span>
                </div>

                <div
                  style={{
                    marginTop: '8px',
                    paddingTop: '10px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                    Total Trip Budget (Persisted on Trip):
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '20px', color: 'var(--primary)' }}>
                    ₹{Math.round(costData.totalBudget).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#065f46',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div>
                  🛡 <strong>Verified Submission:</strong> This will create Trip record #{formData.destination} (Budget: ₹{Math.round(costData.totalBudget).toLocaleString('en-IN')}).
                </div>
                <div>
                  💾 <strong>Persisted Bookings:</strong> Transport (₹{(costData.totalTransportBooking || 0).toLocaleString('en-IN')}) and Accommodation (₹{(costData.hotelCost || 0).toLocaleString('en-IN')}) will be created as linked bookings.
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '32px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-light, #eee)',
            }}
          >
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={() => onStepChange(currentStep - 1)}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
                disabled={isSubmitting}
              >
                ← Back
              </button>
            ) : <div />}

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="btn btn-primary"
                style={{ padding: '8px 22px', fontSize: '13px' }}
                disabled={isSubmitting}
              >
                Next Step →
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 800,
                  background: isSubmitting ? 'var(--muted)' : 'var(--primary)',
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Trip on Backend...' : 'Create & Save Trip 🚀'}
              </button>
            )}
          </div>
        </div>

        {/* Right Sticky Column: Live Budget Summary */}
        <div style={{ position: 'sticky', top: '20px' }}>
          <TripCostSummary formData={formData} costData={costData} />
        </div>
      </div>
    </form>
  );
}
