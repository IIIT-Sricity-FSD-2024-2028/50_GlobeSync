import React from 'react';

export default function AgencyFinancialSummary({
  baseBudget = 0,
  transportType = 'Flight',
  carrier = '',
  carrierPrice = 0,
  lodgingTier = 'Deluxe',
  lodgingPrice = 0,
  guideRequested = false,
  guideFee = 0,
  passengerCount = 1,
  stayDays = 3,
  agencyCommissionRate = 1.5,
  title = '',
  destination = '',
  category = 'Family Vacation',
  notes = '',
  onNotesChange,
  onCategoryChange,
}) {
  const numPassengers = Math.max(1, passengerCount);
  const totalTransport = carrierPrice * numPassengers;
  const totalLodging = lodgingPrice * numPassengers;
  const totalGuide = guideRequested ? (guideFee || 1500) : 0;
  const totalBase = Number(baseBudget) || 0;

  const grossTotal = totalBase + totalTransport + totalLodging + totalGuide;
  const commissionRate = Number(agencyCommissionRate) || 1.5;
  const commissionAmount = Math.round((grossTotal * commissionRate) / 100);
  const netPlatformPayable = grossTotal - commissionAmount;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Itemized Cost Breakdown */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px',
          }}
        >
          <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
            Itemized Cost Breakdown ({numPassengers} {numPassengers === 1 ? 'Passenger' : 'Passengers'})
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
              <span>Base Itinerary Activities & Planning:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{totalBase.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
              <span>
                Transit ({transportType} · {carrier || 'Selected Carrier'} × {numPassengers}):
              </span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{totalTransport.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
              <span>
                Lodging ({lodgingTier} Tier · {stayDays} Nights × {numPassengers}):
              </span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{totalLodging.toLocaleString()}</span>
            </div>

            {guideRequested && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                <span>Dedicated Guide Coordination Fee:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{totalGuide.toLocaleString()}</span>
              </div>
            )}

            <div
              style={{
                borderTop: '2px dashed #e2e8f0',
                paddingTop: '12px',
                marginTop: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Total Gross Client Price:</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f766e' }}>₹{grossTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Notes and Category Inputs */}
          <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Trip Category
              </label>
              <select
                value={category}
                onChange={(e) => onCategoryChange && onCategoryChange(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="Family Vacation">Family Vacation</option>
                <option value="Corporate / MICE">Corporate / MICE</option>
                <option value="Honeymoon & Romantic">Honeymoon & Romantic</option>
                <option value="Adventure & Wildlife">Adventure & Wildlife</option>
                <option value="Luxury Custom Tour">Luxury Custom Tour</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Client Preferences & Internal Notes
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => onNotesChange && onNotesChange(e.target.value)}
                placeholder="Special notes (e.g., flight seat preferences, dietary needs, arrival pickup instructions)..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Commission Preview & Net Payable */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Commission Card */}
          <div
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
              border: '1.5px solid #86efac',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                Agency B2B Margin Preview
              </span>
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: '1px solid #86efac',
                }}
              >
                {commissionRate}% Tier
              </span>
            </div>

            <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', marginBottom: '4px' }}>
              +₹{commissionAmount.toLocaleString()}
            </div>
            <p style={{ fontSize: '12px', color: '#166534', margin: 0 }}>
              Direct commission credited to your agency ledger upon booking confirmation.
            </p>
          </div>

          {/* Net Platform Settlement Card */}
          <div
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1px solid #cbd5e1',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Net Payable to Platform
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              ₹{netPlatformPayable.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Gross Client Total (₹{grossTotal.toLocaleString()}) minus Agency Commission (₹{commissionAmount.toLocaleString()})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

