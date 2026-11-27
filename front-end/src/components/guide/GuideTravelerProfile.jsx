import React, { useState } from 'react';
import GuideTripItineraryManager from './GuideTripItineraryManager';

/**
 * GuideTravelerProfile
 * Right pane detail view for the selected assigned traveler or agency contact.
 * Features:
 * - Multi-trip selector pill row (handles multiple trips assigned to the same traveler)
 * - Tabbed view: Profile & Trip Details vs Trip Progress & Daily Itineraries
 * - Permitted tour lifecycle actions: Start Tour (Confirmed -> Active) and Complete Tour (Active -> Completed)
 * - Scoped booking portfolio display without forbidden global GET /bookings calls
 * - Missing records handled gracefully with fallbacks
 */
export default function GuideTravelerProfile({
  contact,
  selectedTrip,
  itineraries = [],
  bookings = [],
  isLoadingItineraries = false,
  isUpdatingStatus = false,
  isUpdatingActivity = false,
  onSelectTrip,
  onStartTrip,
  onCompleteTrip,
  onOpenAddActivity,
  onOpenEditActivity,
  onUpdateActivityStatus,
  onOpenSuggestModal,
}) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'itinerary'

  if (!contact) {
    return (
      <div className="card guide-empty-profile-card">
        <div style={{ fontSize: '56px', marginBottom: '14px' }}>👤</div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
          Select an Assigned Client
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '380px', margin: '0 auto' }}>
          Choose a traveler or agency contact from the roster on the left to review their trips, accommodations, and itinerary schedule.
        </p>
      </div>
    );
  }

  const isAgency = contact.type === 'agency';
  const initial = (contact.name || '?').charAt(0).toUpperCase();

  // Find hotel booking for this specific trip from scoped bookings
  const tripBookings = bookings.filter((b) => b.tripId === selectedTrip?.tripId);
  const hotelBooking = tripBookings.find((b) => b.type === 'Hotel');
  const hotelText = hotelBooking ? hotelBooking.service : 'No hotel assigned yet';

  const codeTag = isAgency
    ? `#AGY-${String(contact.contactId || 0).padStart(4, '0')}`
    : `#TRV-${String(contact.contactId || 0).padStart(4, '0')}`;

  const canStartTrip = selectedTrip?.status === 'Confirmed';
  const canCompleteTrip = selectedTrip?.status === 'Active';

  return (
    <div className="card guide-profile-container-card">
      {/* Top Header Card */}
      <div className="guide-profile-top-header">
        <div className="guide-profile-avatar-wrap">
          <div className={`guide-profile-big-avatar ${isAgency ? 'agency' : 'traveler'}`}>
            {initial}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 className="guide-profile-name">{contact.name}</h3>
              <span className={`guide-tag-badge ${isAgency ? 'agency-badge' : 'traveler-badge'}`}>
                {isAgency ? '🏢 Agency Partner' : '🎒 Individual Traveler'}
              </span>
              <span className="guide-tag-badge trip-id-badge">{codeTag}</span>
            </div>
            <div className="guide-profile-contact-row">
              {contact.email && <span>📧 {contact.email}</span>}
              {contact.phone && <span>📞 {contact.phone}</span>}
              {!isAgency && contact.age && <span>🎂 {contact.age} yrs</span>}
              {!isAgency && contact.gender && <span>⚧ {contact.gender}</span>}
            </div>
          </div>
        </div>

        <div className="guide-profile-header-actions">
          <button
            type="button"
            className="btn btn-secondary guide-btn-header-suggest"
            onClick={onOpenSuggestModal}
            disabled={!selectedTrip}
          >
            ✈️ Suggest Itinerary
          </button>
        </div>
      </div>

      {/* Multi-Trip Selection Pills (Handling travelers with multiple assigned trips) */}
      {contact.trips.length > 1 && (
        <div className="guide-multi-trip-bar">
          <span className="guide-multi-trip-label">
            Assigned Tours ({contact.trips.length}):
          </span>
          <div className="guide-multi-trip-pills">
            {contact.trips.map((t) => {
              const isTripActive = t.tripId === selectedTrip?.tripId;
              return (
                <button
                  key={t.tripId}
                  type="button"
                  onClick={() => onSelectTrip(t)}
                  className={`guide-trip-select-pill ${isTripActive ? 'active' : ''}`}
                >
                  <span>📍 {t.destination}</span>
                  <span className="guide-trip-pill-id">#{t.tripId}</span>
                  <span className={`guide-status-pill status-${(t.status || 'pending').toLowerCase()}`}>
                    {t.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="guide-profile-tabs">
        <button
          type="button"
          className={`guide-profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span>👤 Profile & Trip Details</span>
        </button>
        <button
          type="button"
          className={`guide-profile-tab ${activeTab === 'itinerary' ? 'active' : ''}`}
          onClick={() => setActiveTab('itinerary')}
        >
          <span>📅 Daily Itinerary ({itineraries.length})</span>
        </button>
      </div>

      {/* Tab Content 1: Profile & Trip Overview */}
      {activeTab === 'profile' && (
        <div className="guide-tab-panel">
          {selectedTrip ? (
            <>
              {/* Trip Highlight Box with Tour Lifecycle Actions */}
              <div className="guide-trip-details-banner">
                <div className="guide-trip-banner-head">
                  <div>
                    <span className="guide-trip-banner-tag">ACTIVE TRIP CONTEXT</span>
                    <h4 className="guide-trip-banner-title">
                      📍 {selectedTrip.destination}
                    </h4>
                    <span className="guide-trip-banner-dates">
                      📅 {selectedTrip.startDate} to {selectedTrip.endDate}
                    </span>
                  </div>

                  <div className="guide-trip-banner-actions">
                    <span className={`guide-status-pill status-${(selectedTrip.status || 'pending').toLowerCase()}`}>
                      Status: {selectedTrip.status}
                    </span>

                    {/* Start Tour Action (Confirmed -> Active) */}
                    {canStartTrip && (
                      <button
                        type="button"
                        onClick={() => onStartTrip(selectedTrip.tripId)}
                        disabled={isUpdatingStatus}
                        className="btn guide-btn-start-tour"
                        title="Start this guided tour and transition status to Active"
                      >
                        {isUpdatingStatus ? 'Starting...' : '▶ Start Tour'}
                      </button>
                    )}

                    {/* Complete Tour Action (Active -> Completed) */}
                    {canCompleteTrip && (
                      <button
                        type="button"
                        onClick={() => onCompleteTrip(selectedTrip.tripId)}
                        disabled={isUpdatingStatus}
                        className="btn guide-btn-complete-tour"
                        title="Mark this guided tour as Completed"
                      >
                        {isUpdatingStatus ? 'Completing...' : '✓ Complete Tour'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="guide-trip-info-grid">
                  <div className="guide-trip-info-item">
                    <span className="guide-info-label">Trip Identifier</span>
                    <span className="guide-info-val">#{selectedTrip.tripId}</span>
                  </div>
                  <div className="guide-info-item">
                    <span className="guide-info-label">Estimated Budget</span>
                    <span className="guide-info-val guide-budget-color">
                      ₹{Number(selectedTrip.budget || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="guide-info-item">
                    <span className="guide-info-label">Guide Decision</span>
                    <span className="guide-info-val">
                      {selectedTrip.guideStatus || 'Accepted'}
                    </span>
                  </div>
                  <div className="guide-info-item">
                    <span className="guide-info-label">Assigned Hotel</span>
                    <span className="guide-info-val hotel-color">
                      🏨 {hotelText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scoped Booking Portfolio (from GET /bookings/guide/:guideId) */}
              <div className="guide-bookings-section">
                <h4 className="guide-section-subtitle">
                  📋 Trip Booking Portfolio (Scoped)
                </h4>
                {tripBookings.length === 0 ? (
                  <div className="guide-empty-bookings-box">
                    <span>ℹ️</span> No booking reservations registered for this trip.
                  </div>
                ) : (
                  <div className="guide-bookings-list">
                    {tripBookings.map((b) => (
                      <div key={b.bookingId} className="guide-booking-item">
                        <div>
                          <div className="guide-booking-service">{b.service}</div>
                          <div className="guide-booking-meta">
                            <span className="guide-booking-type">{b.type}</span>
                            <span>•</span>
                            <span>Booked on {b.bookingDate}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`guide-status-pill status-${(b.status || 'pending').toLowerCase()}`}>
                            {b.status}
                          </span>
                          <div className="guide-booking-amount">
                            ₹{Number(b.amount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="guide-empty-bookings-box">
              No trip selected.
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Itinerary & Activities */}
      {activeTab === 'itinerary' && (
        <div className="guide-tab-panel">
          <GuideTripItineraryManager
            trip={selectedTrip}
            itineraries={itineraries}
            isLoadingItineraries={isLoadingItineraries}
            isUpdatingActivity={isUpdatingActivity}
            onOpenAddActivity={onOpenAddActivity}
            onOpenEditActivity={onOpenEditActivity}
            onUpdateActivityStatus={onUpdateActivityStatus}
            onOpenSuggestModal={onOpenSuggestModal}
          />
        </div>
      )}
    </div>
  );
}
