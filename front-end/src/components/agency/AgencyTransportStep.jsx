import React from 'react';
import { analyzeRoute, getRouteTransportCatalog } from '../trips/tripCalculations';

const LODGING_TIERS = [
  { tier: 'Standard', name: 'Standard 3★ Hotel / Guest House', pricePerNight: 2500, desc: 'Clean, comfortable lodging with complimentary breakfast and Wi-Fi.' },
  { tier: 'Deluxe', name: 'Deluxe 4★ Premium Hotel & Resort', pricePerNight: 5500, desc: 'Centrally located luxury rooms, pool, multi-cuisine dining, and concierge.' },
  { tier: 'Luxury', name: 'Ultra Luxury 5★ Heritage Palace & Villa', pricePerNight: 11000, desc: 'World-class 5-star hospitality, spa vouchers, private transfers, and curated butler service.' },
];

export default function AgencyTransportStep({
  origin = 'New Delhi, India',
  destination = '',
  transportType = 'Flight',
  carrier = '',
  carrierPrice = 7800,
  lodgingTier = 'Deluxe',
  passengerCount = 1,
  stayDays = 3,
  onChange,
  onTransportChange,
}) {
  const triggerChange = (patch) => {
    if (typeof onChange === 'function') {
      onChange(patch);
    }
    if (typeof onTransportChange === 'function') {
      onTransportChange(patch);
    }
  };

  const routeInfo = analyzeRoute(origin, destination);
  const baseCarriers = getRouteTransportCatalog(
    transportType === 'Private Cab' ? 'Bus' : transportType,
    origin,
    destination
  );

  // Extend with Private Cab options if Private Cab is selected
  const carriers = transportType === 'Private Cab' ? [
    { name: 'Sedan (Dzire / Etios) Dedicated Cab', price: 4200, duration: 'Private On-Demand', stops: 'Direct private transfer' },
    { name: 'SUV (Innova Crysta) Dedicated Cab', price: 6800, duration: 'Private On-Demand', stops: 'Spacious luggage & highway toll included' },
    { name: 'Luxury Van (Tempo Traveller / Force Urbania)', price: 9500, duration: 'Private Charter', stops: 'Ideal for group tours and families' },
  ] : baseCarriers;

  const currentLodging = LODGING_TIERS.find((l) => l.tier === lodgingTier) || LODGING_TIERS[1];
  const lodgingCostPerPerson = currentLodging.pricePerNight * Math.max(1, stayDays);

  return (
    <div>
      {/* Route Badge */}
      <div
        style={{
          padding: '12px 16px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          marginBottom: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
            Journey Route
          </span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
            🛫 {origin || 'Origin'} ➔ 🛬 {destination || 'Destination'}
          </div>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            background: `${routeInfo.color}18`,
            color: routeInfo.color,
            padding: '4px 10px',
            borderRadius: '16px',
            border: `1px solid ${routeInfo.color}40`,
          }}
        >
          {routeInfo.badge}
        </span>
      </div>

      {/* Transport Mode Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
          Select Transport Mode
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { type: 'Flight', icon: '✈️', label: 'Flight' },
            { type: 'Train', icon: '🚆', label: 'Train' },
            { type: 'Bus', icon: '🚌', label: 'Bus' },
            { type: 'Private Cab', icon: '🚕', label: 'Private Cab' },
          ].map((mode) => {
            const isSelected = transportType === mode.type;
            return (
              <button
                key={mode.type}
                type="button"
                onClick={() => {
                  const defaultPrice = mode.type === 'Flight' ? 7800 : mode.type === 'Train' ? 2400 : mode.type === 'Bus' ? 1200 : 4200;
                  triggerChange({
                    transportType: mode.type,
                    carrier: '',
                    carrierPrice: defaultPrice,
                  });
                }}
                style={{
                  padding: '12px 8px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #0d9488' : '1px solid #cbd5e1',
                  background: isSelected ? '#f0fdfa' : '#ffffff',
                  color: isSelected ? '#0f766e' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{mode.icon}</div>
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Carrier / Class Selection */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
          Operator & Class Options
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {carriers.map((c) => {
            const isSelected = carrier === c.name || (!carrier && c === carriers[0]);
            return (
              <div
                key={c.name}
                onClick={() => triggerChange({ carrier: c.name, carrierPrice: c.price })}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #0d9488' : '1px solid #e2e8f0',
                  background: isSelected ? '#f0fdfa' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{c.name}</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0d9488' }}>₹{c.price.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  {c.duration} · {c.stops || 'Standard baggage'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accommodation Tier Selection */}
      <div>
        <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
          Accommodation Tier ({stayDays} Nights)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {LODGING_TIERS.map((tier) => {
            const isSelected = lodgingTier === tier.tier;
            const totalForStay = tier.pricePerNight * Math.max(1, stayDays);
            return (
              <div
                key={tier.tier}
                onClick={() => triggerChange({ lodgingTier: tier.tier, lodgingPrice: totalForStay })}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #0d9488' : '1px solid #e2e8f0',
                  background: isSelected ? '#f0fdfa' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{tier.tier} Tier</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0d9488' }}>
                    ₹{tier.pricePerNight.toLocaleString()}/night
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>
                  {tier.desc}
                </p>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginTop: '6px' }}>
                  Total {stayDays} Nights: ₹{totalForStay.toLocaleString()} / person
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

