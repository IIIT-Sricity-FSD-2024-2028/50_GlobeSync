import React from 'react';

/**
 * SuperMetricCard
 *
 * Presentational component for transparent governance metrics.
 * Explicitly surfaces data provenance: population, status filter, units, and time period.
 *
 * @param {Object} props
 * @param {string} props.title - Metric title
 * @param {string|number|React.ReactNode} props.value - Displayed value
 * @param {string} props.population - Source population / entity dataset
 * @param {string} props.statusFilter - Applied lifecycle / status filter
 * @param {string} props.units - Measurement units (e.g., INR, count, ratio)
 * @param {string} props.timePeriod - Timeframe (e.g., All-Time, Current Month)
 * @param {string} [props.accentColor] - Optional accent color for the value
 * @param {string} [props.note] - Optional advisory or telemetry disclaimer
 */
export default function SuperMetricCard({
  title,
  value,
  population,
  statusFilter,
  units,
  timePeriod,
  accentColor = '#0f172a',
  note,
}) {
  return (
    <div
      className="card"
      style={{
        padding: '18px 20px',
        borderRadius: '12px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: accentColor,
            marginBottom: '10px',
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '8px',
          fontSize: '11px',
          color: '#64748b',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        {population && (
          <div>
            <strong style={{ color: '#475569' }}>Population:</strong> {population}
          </div>
        )}
        {statusFilter && (
          <div>
            <strong style={{ color: '#475569' }}>Filter:</strong> <code>{statusFilter}</code>
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          {units && (
            <span>
              <strong style={{ color: '#475569' }}>Units:</strong> {units}
            </span>
          )}
          {timePeriod && (
            <span>
              <strong style={{ color: '#475569' }}>Period:</strong> {timePeriod}
            </span>
          )}
        </div>
        {note && (
          <div
            style={{
              marginTop: '4px',
              color: '#92400e',
              background: '#fffbeb',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
            }}
          >
            ℹ️ {note}
          </div>
        )}
      </div>
    </div>
  );
}
