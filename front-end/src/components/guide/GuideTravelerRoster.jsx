import React from 'react';

/**
 * GuideTravelerRoster
 * Left pane roster of assigned clients (individual travelers and agency contacts).
 * Features:
 * - Derives roster from trips assigned to current guide
 * - Shows all assigned trips for a contact, handling multiple trips without dropping any
 * - Clearly distinguishes agency contacts from individual travelers
 * - Handles missing related records gracefully with fallback values
 */
export default function GuideTravelerRoster({
  contacts = [],
  selectedContactKey = null,
  searchQuery = '',
  onSearchChange,
  onSelectContact,
}) {
  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (c.name || '').toLowerCase().includes(q);
    const emailMatch = (c.email || '').toLowerCase().includes(q);
    const tripMatch = c.trips.some((t) =>
      (t.destination || '').toLowerCase().includes(q) || String(t.tripId).includes(q)
    );
    return nameMatch || emailMatch || tripMatch;
  });

  return (
    <div className="card guide-roster-card">
      <div className="guide-roster-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="guide-roster-title">
            👥 Assigned Clients ({contacts.length})
          </h3>
        </div>
        <div className="guide-roster-search-wrap">
          <span className="guide-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search traveler, agency, destination..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="guide-roster-search-input"
          />
        </div>
      </div>

      <div className="guide-roster-list">
        {filteredContacts.length === 0 ? (
          <div className="guide-roster-empty">
            <span style={{ fontSize: '28px' }}>🔍</span>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {contacts.length === 0
                ? 'No assigned travelers or agency contacts yet.'
                : 'No contacts match your search query.'}
            </p>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isSelected = contact.key === selectedContactKey;
            const isAgency = contact.type === 'agency';
            const tripCount = contact.trips.length;
            const initial = (contact.name || '?').charAt(0).toUpperCase();

            // Destination summary of first trip or combined
            const tripDestinations = contact.trips.map((t) => t.destination).join(', ');

            return (
              <div
                key={contact.key}
                onClick={() => onSelectContact(contact.key)}
                className={`guide-roster-item ${isSelected ? 'selected' : ''}`}
              >
                <div className={`guide-roster-avatar ${isAgency ? 'agency' : 'traveler'}`}>
                  {initial}
                </div>

                <div className="guide-roster-item-info">
                  <div className="guide-roster-item-top">
                    <span className="guide-roster-name">{contact.name}</span>
                    <span className={`guide-roster-badge ${isAgency ? 'agency' : 'traveler'}`}>
                      {isAgency ? '🏢 Agency' : '🎒 Traveler'}
                    </span>
                  </div>

                  <div className="guide-roster-destinations" title={tripDestinations}>
                    📍 {contact.trips[0]?.destination || 'Destination'}
                    {tripCount > 1 ? ` (+${tripCount - 1} more)` : ''}
                  </div>

                  <div className="guide-roster-item-bottom">
                    <span className="guide-roster-trip-count">
                      {tripCount === 1 ? '1 Assigned Tour' : `${tripCount} Assigned Tours`}
                    </span>
                    <span className="guide-roster-arrow">→</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
