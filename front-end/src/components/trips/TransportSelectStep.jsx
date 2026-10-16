import React from 'react';
import { getRouteTransportCatalog, analyzeRoute } from './tripCalculations';

/**
 * TransportSelectStep: Controlled component for selecting transit mode, journey type, and carrier
 * Dynamically computes carrier options and pricing tailored to the Departure (From) and Destination (To) route.
 */
export default function TransportSelectStep({
  origin = '',
  destination = '',
  transportType = 'Flight',
  tripType = 'round',
  selectedCarrier = '',
  includeProtection = false,
  onTransportTypeChange,
  onTripTypeChange,
  onCarrierSelect,
  onProtectionToggle,
}) {
  const routeInfo = analyzeRoute(origin, destination);
  const carriers = getRouteTransportCatalog(transportType, origin, destination);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Select Transport Mode</h3>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              background: '#e0e7ff',
              color: '#3730a3',
              borderRadius: '12px',
              fontWeight: 700,
            }}
          >
            Route-Calibrated Pricing
          </span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          Choose your travel mode and operator for accurate route-based itinerary budget calculations.
        </p>
      </div>

      {/* Dynamic Route Banner */}
      <div
        style={{
          padding: '14px 18px',
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Confirmed Journey Route
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            🛫 {origin || 'Departure City'} <span style={{ color: 'var(--primary)', margin: '0 4px' }}>➔</span> 🛬 {destination || 'Destination'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {routeInfo.label}
          </div>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            background: `${routeInfo.color}18`,
            color: routeInfo.color,
            padding: '4px 12px',
            borderRadius: '20px',
            border: `1px solid ${routeInfo.color}40`,
          }}
        >
          {routeInfo.badge}
        </span>
      </div>

      {/* Transit Type Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {[
          { type: 'Flight', icon: '✈', label: 'Flight' },
          { type: 'Train', icon: '🚂', label: 'Train' },
          { type: 'Bus', icon: '🚌', label: 'Bus' },
        ].map((item) => {
          const isSelected = transportType === item.type;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => onTransportTypeChange(item.type)}
              style={{
                padding: '16px 12px',
                border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                background: isSelected ? '#ffeef5' : '#fff',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '26px', marginBottom: '6px' }}>{item.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? 'var(--primary)' : 'inherit' }}>
                {item.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Trip Direction: Round vs One-way */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
          Journey Type
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            type="button"
            onClick={() => onTripTypeChange('round')}
            style={{
              padding: '12px',
              border: `1.5px solid ${tripType === 'round' ? 'var(--primary)' : 'var(--border)'}`,
              background: tripType === 'round' ? '#ffeef5' : '#fff',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '14px', color: tripType === 'round' ? 'var(--primary)' : 'inherit' }}>
              🔄 Round Trip
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              Travel to destination and return back to {origin ? origin.split(',')[0] : 'origin'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onTripTypeChange('oneway')}
            style={{
              padding: '12px',
              border: `1.5px solid ${tripType === 'oneway' ? 'var(--primary)' : 'var(--border)'}`,
              background: tripType === 'oneway' ? '#ffeef5' : '#fff',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '14px', color: tripType === 'oneway' ? 'var(--primary)' : 'inherit' }}>
              ➡️ One Way
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              Single outward journey to {destination ? destination.split(',')[0] : 'destination'}
            </div>
          </button>
        </div>
      </div>

      {/* Available Carrier Options */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
          Available {transportType} Operators for this Route
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {carriers.map((c) => {
            const isChosen = selectedCarrier === c.name;
            return (
              <div
                key={c.name}
                onClick={() => onCarrierSelect(c.name, c.price)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `1.5px solid ${isChosen ? 'var(--primary)' : 'var(--border)'}`,
                  background: isChosen ? '#fff1f6' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                    {isChosen && <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 800 }}>✓ SELECTED</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                    ⏱ {c.time} {c.note && `• ${c.note}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{c.price.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    per person / one way
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add-on: Cancellation Protection */}
      <div
        style={{
          padding: '14px 16px',
          background: '#f8fafc',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700 }}>
            🛡 Optional Flexible Cancellation Protection
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Full refund minus flat fee ({transportType === 'Flight' ? '₹100' : transportType === 'Bus' ? '₹70' : '₹50'}) if cancelled up to 48h prior.
          </div>
        </div>
        <input
          type="checkbox"
          checked={includeProtection}
          onChange={(e) => onProtectionToggle(e.target.checked)}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}
