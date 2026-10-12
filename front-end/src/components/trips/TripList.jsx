import React from 'react';
import { Link } from 'react-router-dom';
import TripCard from './TripCard';

/**
 * TripList: Container component rendering the responsive grid of TripCards
 * or descriptive empty states based on filter and dataset conditions.
 */
export default function TripList({
  trips = [],
  onEditTrip,
  onCancelTrip,
  selectedTripId = null,
  onSelectTrip = null,
  hasActiveFilters = false,
  onClearFilters,
}) {
  // Empty State: No trips found
  if (trips.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: '60px 24px',
          textAlign: 'center',
          borderRadius: '16px',
          background: '#fff',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>
          {hasActiveFilters ? '🔍' : '🎒'}
        </div>

        {hasActiveFilters ? (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              No matching itineraries found
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px' }}>
              No trips match your current status filter or search keywords. Try adjusting your query.
            </p>
            <button
              type="button"
              onClick={onClearFilters}
              className="btn btn-secondary"
              style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 700 }}
            >
              Clear Filters ↺
            </button>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              No trips scheduled yet
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px' }}>
              You haven't scheduled any journeys yet. Ready to design your next travel adventure?
            </p>
            <Link
              to="/traveler/plan"
              className="btn btn-primary"
              style={{ textDecoration: 'none', padding: '10px 22px', fontSize: '14px', fontWeight: 700 }}
            >
              + Create Your First Itinerary 🗺
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Populated Grid: Render each TripCard using stable database tripId as key
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
      }}
    >
      {trips.map((trip) => {
        const tripId = trip.tripId || trip.id;
        const isSelected = selectedTripId === tripId;
        return (
          <TripCard
            key={tripId}
            trip={trip}
            onEdit={onEditTrip}
            onCancel={onCancelTrip}
            onSelect={onSelectTrip}
            isSelected={isSelected}
          />
        );
      })}
    </div>
  );
}
