import React from 'react';

/**
 * TripCostSummary: Live calculation widget showing cost breakdown of selected components
 * Clearly differentiates persisted backend records from simulated planning estimates.
 */
export default function TripCostSummary({ formData, costData }) {
  const {
    destination = '',
    startDate = '',
    endDate = '',
    numPersons = 1,
    transportName = '',
    transportType = '',
    tripType = 'round',
    hotelName = '',
    guideName = '',
    includeCancellationProtection = false,
  } = formData;

  const {
    days = 1,
    transportCost = 0,
    insuranceCost = 0,
    cancellationFee = 0,
    totalTransportBooking = 0,
    hotelCost = 0,
    guideCost = 0,
    platformFee = 500,
    totalBudget = 0,
  } = costData;

  const totalPersistedBookings = (transportName ? totalTransportBooking : 0) + (hotelName ? hotelCost : 0);

  return (
    <div
      className="card"
      style={{
        padding: '24px',
        borderRadius: '16px',
        background: '#fff',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '17px', fontWeight: 800 }}>
          Itinerary Summary & Budget
        </h4>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            background: '#ecfdf5',
            color: '#065f46',
            borderRadius: '12px',
            fontWeight: 700,
          }}
        >
          Live Calculation
        </span>
      </div>

      {/* Target details */}
      <div
        style={{
          background: 'var(--bg-soft, #fcfade)',
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '13px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div><strong>Destination:</strong> {destination || 'Not selected'}</div>
        <div>
          <strong>Dates:</strong> {startDate || '—'} → {endDate || '—'} ({days} Day{days !== 1 ? 's' : ''})
        </div>
        <div><strong>Travelers:</strong> {numPersons} Person{numPersons !== 1 ? 's' : ''}</div>
      </div>

      {/* Line Item Costs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
        {/* Transport */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
          <div>
            <span>
              {transportName ? `Transit: ${transportName} (${tripType === 'round' ? 'Round Trip' : 'One Way'} × ${numPersons})` : 'Transport (Not selected)'}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Simulated Operator Fare
            </div>
          </div>
          <span style={{ fontWeight: 600 }}>₹{transportCost.toLocaleString('en-IN')}</span>
        </div>

        {/* Compulsory Insurance */}
        {transportCost > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857' }}>
            <div>
              <span>Compulsory Travel Insurance (7%)</span>
              <div style={{ fontSize: '11px', color: '#059669' }}>Persisted with Transport Booking</div>
            </div>
            <span style={{ fontWeight: 600 }}>₹{Math.round(insuranceCost).toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Cancellation Protection */}
        {cancellationFee > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857' }}>
            <div>
              <span>Flexible Cancellation Protection</span>
              <div style={{ fontSize: '11px', color: '#059669' }}>Persisted with Transport Booking ({transportType}: ₹{cancellationFee})</div>
            </div>
            <span style={{ fontWeight: 600 }}>₹{cancellationFee.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Hotel */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
          <div>
            <span>
              {hotelName ? `Hotel: ${hotelName} (${days} night${days !== 1 ? 's' : ''} × ${numPersons})` : 'Accommodation: Self-Arranged (₹0)'}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {hotelName ? 'Simulated Hotel Tier (Persisted as Hotel Booking)' : 'Private Lodging'}
            </div>
          </div>
          <span style={{ fontWeight: 600 }}>₹{hotelCost.toLocaleString('en-IN')}</span>
        </div>

        {/* Tour Guide */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
          <div>
            <span>
              {guideName ? `Tour Guide: ${guideName}` : 'Tour Guide: Self-Guided (₹0)'}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {guideName ? 'Flat Trip Fee (Persisted via Trip.guideId)' : 'Self-Exploration'}
            </div>
          </div>
          <span style={{ fontWeight: 600 }}>₹{guideCost.toLocaleString('en-IN')}</span>
        </div>

        {/* Platform Fee */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
          <div>
            <span>Platform Coordination Fee</span>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Estimated Coordination Charge
            </div>
          </div>
          <span style={{ fontWeight: 600 }}>₹{platformFee.toLocaleString('en-IN')}</span>
        </div>

        {/* Total Budget Divider */}
        <div
          style={{
            borderTop: '2px dashed var(--border-light, #eee)',
            margin: '8px 0',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Calculated Trip Budget
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Persisted on Trip.budget
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
            ₹{Math.round(totalBudget).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Persisted vs Estimated Transparency Callout */}
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div>
            <strong>💾 Persisted Bookings:</strong> ₹{totalPersistedBookings.toLocaleString('en-IN')}
            {transportName && ` (Transit ₹${totalTransportBooking.toLocaleString('en-IN')})`}
            {hotelName && ` (Hotel ₹${hotelCost.toLocaleString('en-IN')})`}
          </div>
          <div>
            <strong>📋 Persisted Trip Budget:</strong> ₹{Math.round(totalBudget).toLocaleString('en-IN')} (Includes bookings + guide + coordination fee)
          </div>
        </div>
      </div>
    </div>
  );
}
