import React from 'react';

/**
 * ActiveTripHeader: Banner displayed at the top of the daily itinerary management section.
 * 
 * Props:
 * - selectedTrip (object): The currently selected trip object
 * - onOpenAddActivity (func): Opens the new activity form
 * - onClose (func): Deselects active trip and collapses the itinerary section
 */
export default function ActiveTripHeader({
  selectedTrip,
  onOpenAddActivity,
  onClose,
}) {
  if (!selectedTrip) return null;

  return (
    <div
      className="card"
      style={{
        padding: '18px 24px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #ffffff 0%, #fff7f9 100%)',
        border: '1.5px solid var(--primary)',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              background: 'var(--primary)',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            ACTIVE TRIP #{selectedTrip.tripId || selectedTrip.id}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            📅 {selectedTrip.startDate} &rarr; {selectedTrip.endDate}
          </span>
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)', margin: '4px 0 0' }}>
          📍 Managing Itinerary: {selectedTrip.destination}
        </h3>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={onOpenAddActivity}
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}
        >
          ➕ Add Activity
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary"
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}
          title="Close itinerary section"
        >
          ✕ Close Section
        </button>
      </div>
    </div>
  );
}
