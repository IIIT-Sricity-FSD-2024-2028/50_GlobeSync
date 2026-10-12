import React from 'react';
import StatusBadge from '../common/StatusBadge';

/**
 * ItineraryList: Displays the daily itinerary schedule and activities for a selected trip.
 *
 * Responsibilities:
 * - Groups activities cleanly by Day Number (Day 1, Day 2, etc.)
 * - Orders activities chronologically within each day by time
 * - Displays activity status badges (Pending, Confirmed, Completed)
 * - Exposes Edit and Delete actions with user confirmation
 * - Handles loading, network errors, and empty schedule states
 *
 * Props:
 * - itineraries: Array of itinerary item objects
 * - selectedTrip: The currently selected trip object
 * - onEditItem: Callback function when traveler clicks "Edit"
 * - onDeleteItem: Callback function when traveler clicks "Delete"
 * - onOpenAddForm: Callback to open the new activity form
 * - loading: Boolean indicating backend fetch in progress
 * - error: Error string if loading failed
 * - onRetry: Callback to retry loading from backend
 * - userRole: Role string of active session ('traveler', 'admin', 'superuser')
 */
export default function ItineraryList({
  itineraries = [],
  selectedTrip,
  onEditItem,
  onDeleteItem,
  onOpenAddForm,
  loading = false,
  error = null,
  onRetry,
  userRole = 'traveler',
}) {
  if (!selectedTrip) {
    return null;
  }

  // 1. Loading State
  if (loading) {
    return (
      <div
        className="card"
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          borderRadius: '16px',
          background: '#fff',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
        <h4 style={{ fontSize: '16px', fontWeight: 700 }}>
          Loading itinerary for Trip #{selectedTrip.tripId || selectedTrip.id}...
        </h4>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
          Fetching scheduled activities from backend database.
        </p>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div
        className="card"
        style={{
          padding: '32px 24px',
          borderRadius: '16px',
          background: '#fef2f2',
          border: '1px solid #fee2e2',
          textAlign: 'center',
          color: '#991b1b',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
        <h4 style={{ fontSize: '16px', fontWeight: 800 }}>Failed to load itinerary</h4>
        <p style={{ fontSize: '13px', margin: '6px 0 16px' }}>{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 700 }}
          >
            Retry Loading ↺
          </button>
        )}
      </div>
    );
  }

  // 3. Empty State (Trip has no scheduled itinerary items yet)
  if (itineraries.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: '48px 24px',
          borderRadius: '16px',
          background: '#fff',
          border: '1px dashed var(--border)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
          No itinerary activities scheduled yet
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '440px', margin: '6px auto 20px' }}>
          Trip #{selectedTrip.tripId} to <strong>{selectedTrip.destination}</strong> has no planned daily
          activities. Add your first day’s schedule to begin coordinating your travel plan!
        </p>
        <button
          type="button"
          onClick={onOpenAddForm}
          className="btn btn-primary"
          style={{ padding: '10px 22px', fontSize: '13px', fontWeight: 700, borderRadius: '10px' }}
        >
          ➕ Add First Activity
        </button>
      </div>
    );
  }

  // Group activities by Day Number
  // Object format: { 1: [activity1, activity2], 2: [activity3] }
  const dayGroups = itineraries.reduce((groups, item) => {
    const day = item.dayNumber || 1;
    if (!groups[day]) {
      groups[day] = [];
    }
    groups[day].push(item);
    return groups;
  }, {});

  // Sort day numbers numerically
  const sortedDays = Object.keys(dayGroups)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="itinerary-list-container">
      {/* Header with quick stats and Add Activity CTA */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)' }}>
            📅 Daily Itinerary Schedule
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
            {itineraries.length} {itineraries.length === 1 ? 'activity' : 'activities'} across{' '}
            {sortedDays.length} {sortedDays.length === 1 ? 'day' : 'days'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddForm}
          className="btn btn-primary"
          style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 700, borderRadius: '10px' }}
        >
          ➕ Add Activity
        </button>
      </div>

      {/* Render Each Day's Schedule */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {sortedDays.map((dayNum) => {
          // Sort activities within day by time string
          const dayActivities = [...dayGroups[dayNum]].sort((a, b) =>
            (a.time || '').localeCompare(b.time || '')
          );

          return (
            <div
              key={dayNum}
              style={{
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Day Header Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '12px',
                    }}
                  >
                    Day {dayNum}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {dayActivities.length} {dayActivities.length === 1 ? 'event' : 'events'} scheduled
                  </span>
                </div>
              </div>

              {/* Day Activity Items */}
              <div style={{ padding: '8px 16px' }}>
                {dayActivities.map((item, index) => {
                  const isLast = index === dayActivities.length - 1;

                  return (
                    <div
                      key={item.itineraryId}
                      style={{
                        padding: '14px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        borderBottom: isLast ? 'none' : '1px solid var(--border-light, #eee)',
                      }}
                    >
                      {/* Left: Time, City, and Activity description */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '240px' }}>
                        {/* Time Badge */}
                        <div
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '6px 10px',
                            borderRadius: '8px',
                            minWidth: '70px',
                            textAlign: 'center',
                            border: '1px solid #dbeafe',
                            flexShrink: 0,
                          }}
                        >
                          ⏰ {item.time || '--:--'}
                        </div>

                        {/* Details */}
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.activity}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                            📍 {item.city} &bull; Item ID #{item.itineraryId}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Badge and Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <StatusBadge status={item.activityStatus || 'Pending'} />

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          className="btn btn-secondary"
                          style={{
                            padding: '5px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                          }}
                          title="Edit this activity"
                        >
                          ✏️ Edit
                        </button>

                        {/* Delete Button - only enabled when backend allows deletion (RolesGuard) */}
                        {(userRole === 'admin' || userRole === 'superuser') && onDeleteItem && (
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item)}
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              background: '#fff',
                              border: '1px solid #fee2e2',
                              color: '#dc2626',
                              cursor: 'pointer',
                            }}
                            title="Delete this activity"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
