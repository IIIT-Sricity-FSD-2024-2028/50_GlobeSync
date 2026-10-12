import React, { useState } from 'react';

/**
 * GuideSelectStep: Select certified guide from actual backend records (GET /guides)
 */
export default function GuideSelectStep({
  guides = [],
  loading = false,
  selectedGuideId = null,
  onGuideSelect,
}) {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [minRating, setMinRating] = useState('0');

  // Filter guides based on selected language and rating during render
  const filteredGuides = guides.filter((g) => {
    const langs = g.languages || [];
    const matchesLang = !selectedLanguage || langs.some((l) => l.toLowerCase() === selectedLanguage.toLowerCase());
    const matchesRating = Number(g.rating || 0) >= Number(minRating);
    return matchesLang && matchesRating;
  });

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Assign a Certified Travel Guide</h3>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              background: '#dcfce7',
              color: '#166534',
              borderRadius: '12px',
              fontWeight: 700,
            }}
          >
            Verified Backend Guides
          </span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          Certified local experts handle destination navigation, cultural storytelling, and group safety.
        </p>
      </div>

      {/* Guide Filters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          padding: '14px',
          background: 'var(--bg-soft, #fcfade)',
          borderRadius: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Language
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: '#fff',
              fontSize: '13px',
            }}
          >
            <option value="">All Languages</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="French">French</option>
            <option value="Japanese">Japanese</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Min Rating
          </label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: '#fff',
              fontSize: '13px',
            }}
          >
            <option value="0">Any Rating</option>
            <option value="4.0">4.0+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
            <option value="4.8">4.8+ Stars</option>
          </select>
        </div>
      </div>

      {/* Self-Guided / Skip Option */}
      <div
        onClick={() => onGuideSelect(null, '', 0)}
        style={{
          padding: '14px 18px',
          borderRadius: '12px',
          border: `1.5px dashed ${selectedGuideId === null ? 'var(--primary)' : 'var(--border)'}`,
          background: selectedGuideId === null ? '#fff1f6' : '#fafafa',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>
            🧭 Self-Guided Tour (No Guide Assigned)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Explore on your own without a personal tour guide. Guide fee is ₹0.
          </div>
        </div>
        {selectedGuideId === null && (
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
            ✓ Selected
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)', fontSize: '14px' }}>
          Loading certified guides from GlobeSync backend...
        </div>
      )}

      {/* Guide Cards */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredGuides.map((guide) => {
            const isChosen = selectedGuideId === guide.guideId;
            const price = Number(guide.pricePerTrip || 5000);
            return (
              <div
                key={guide.guideId}
                onClick={() => onGuideSelect(guide.guideId, guide.name, price)}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: isChosen ? 'var(--primary)' : '#6366f1',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 800,
                    }}
                  >
                    {guide.name ? guide.name[0] : 'G'}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{guide.name}</span>
                      {isChosen && (
                        <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 800 }}>
                          ✓ SELECTED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                      Languages: {Array.isArray(guide.languages) ? guide.languages.join(', ') : 'English'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>
                      ⭐ {guide.rating} • {guide.experience} Years Experience
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{price.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Flat Trip Fee</div>
                </div>
              </div>
            );
          })}

          {filteredGuides.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '13px' }}>
              No guides match the selected language/rating filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
