import React from 'react';

/**
 * PlanningModeSelect: Allows traveler to pick between starting from scratch or selecting a package
 */
export default function PlanningModeSelect({ selectedMode, onSelectMode }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
          Choose How You Would Like to Plan
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Start with a blank custom itinerary or build from one of GlobeSync’s curated packages.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Custom Trip Card */}
        <div
          onClick={() => onSelectMode('custom')}
          style={{
            padding: '28px 24px',
            borderRadius: '16px',
            border: `2px solid ${selectedMode === 'custom' ? 'var(--primary)' : 'var(--border)'}`,
            background: selectedMode === 'custom' ? '#ffeef5' : '#fff',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            boxShadow: selectedMode === 'custom' ? '0 4px 14px rgba(189, 21, 80, 0.12)' : 'none',
          }}
        >
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>🎨</div>
          <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
            Custom Itinerary
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Choose your own dates, starting location, custom destination, transport modes, and certified guide.
          </p>
          <div
            style={{
              marginTop: '16px',
              display: 'inline-block',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--primary)',
            }}
          >
            {selectedMode === 'custom' ? '✓ Selected' : 'Select Custom Plan →'}
          </div>
        </div>

        {/* Pre-planned Package Card */}
        <div
          onClick={() => onSelectMode('package')}
          style={{
            padding: '28px 24px',
            borderRadius: '16px',
            border: `2px solid ${selectedMode === 'package' ? 'var(--primary)' : 'var(--border)'}`,
            background: selectedMode === 'package' ? '#ffeef5' : '#fff',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            boxShadow: selectedMode === 'package' ? '0 4px 14px rgba(189, 21, 80, 0.12)' : 'none',
          }}
        >
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>✨</div>
          <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
            Pre-Planned Package
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Select from our verified backend tour packages with pre-arranged activities, duration, and budgets.
          </p>
          <div
            style={{
              marginTop: '16px',
              display: 'inline-block',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--primary)',
            }}
          >
            {selectedMode === 'package' ? '✓ Selected' : 'Browse Packages →'}
          </div>
        </div>
      </div>
    </div>
  );
}
