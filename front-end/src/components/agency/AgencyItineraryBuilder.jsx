import React, { useState, useEffect } from 'react';
import { guidesApi } from '../../services/api';

export default function AgencyItineraryBuilder({
  startDate,
  endDate,
  itineraryDays = [],
  onDaysChange,
  guideRequested = false,
  onGuideRequestToggle,
  selectedGuideId = '',
  onGuideChange,
}) {
  const [availableGuides, setAvailableGuides] = useState([]);
  const [loadingGuides, setLoadingGuides] = useState(false);

  // Compute number of days between startDate and endDate
  const dayCount = (() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  })();

  // Initialize itinerary days if count changed
  useEffect(() => {
    if (itineraryDays.length !== dayCount) {
      const newDays = [];
      for (let i = 1; i <= dayCount; i++) {
        const existing = itineraryDays[i - 1] || {};
        newDays.push({
          dayNumber: i,
          title: existing.title || (i === 1 ? 'Arrival & City Orientation' : i === dayCount ? 'Farewell & Departure' : `Day ${i} Exploration`),
          morning: existing.morning || (i === 1 ? 'Airport pickup & hotel check-in' : 'Morning landmark tour & sightseeing'),
          afternoon: existing.afternoon || 'Local market & cultural heritage visit',
          evening: existing.evening || (i === 1 ? 'Welcome dinner at signature restaurant' : 'Leisure evening & sunset walk'),
          meals: existing.meals || { breakfast: true, lunch: i > 1, dinner: true },
        });
      }
      onDaysChange(newDays);
    }
  }, [dayCount]);

  // Load guides
  useEffect(() => {
    let isMounted = true;
    const fetchGuides = async () => {
      setLoadingGuides(true);
      try {
        const data = await guidesApi.getAll();
        if (isMounted && Array.isArray(data)) {
          setAvailableGuides(data);
        }
      } catch (err) {
        console.error('Failed to load guides:', err);
      } finally {
        if (isMounted) setLoadingGuides(false);
      }
    };
    fetchGuides();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateDayField = (index, field, value) => {
    const updated = [...itineraryDays];
    updated[index] = { ...updated[index], [field]: value };
    onDaysChange(updated);
  };

  const toggleMeal = (index, meal) => {
    const updated = [...itineraryDays];
    const currentMeals = updated[index]?.meals || { breakfast: true, lunch: false, dinner: true };
    updated[index] = {
      ...updated[index],
      meals: {
        ...currentMeals,
        [meal]: !currentMeals[meal],
      },
    };
    onDaysChange(updated);
  };

  const selectedGuide = availableGuides.find((g) => String(g.guideId || g.id) === String(selectedGuideId));

  return (
    <div>
      {/* Guide Assignment Section */}
      <div
        style={{
          padding: '16px 20px',
          background: '#f0fdfa',
          border: '1.5px solid #99f6e4',
          borderRadius: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f766e' }}>
              🧭 Professional Tour Guide Coordinator
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Request a certified local guide to accompany your clients throughout the itinerary.
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#0f766e' }}>
            <input
              type="checkbox"
              checked={guideRequested}
              onChange={(e) => onGuideRequestToggle(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#0d9488', cursor: 'pointer' }}
            />
            Request Guide for Trip
          </label>
        </div>

        {guideRequested && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #ccfbf1' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e', display: 'block', marginBottom: '6px' }}>
              Select Available Guide:
            </label>
            <select
              value={selectedGuideId}
              onChange={(e) => onGuideChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #99f6e4',
                fontSize: '13px',
                background: '#fff',
              }}
            >
              <option value="">-- Platform Auto-Assign Guide (Pending Dispatch) --</option>
              {availableGuides.map((g) => (
                <option key={g.guideId || g.id} value={g.guideId || g.id}>
                  {g.name} ({g.languages || 'English, Hindi'} · ₹{g.pricePerTrip || 1500}/trip · Rating: {g.rating || '4.9'}★)
                </option>
              ))}
            </select>
            {selectedGuide && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#0f766e' }}>
                ✓ Guide <strong>{selectedGuide.name}</strong> will receive notification upon trip confirmation.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Day by Day Cards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Daily Itinerary Builder ({dayCount} Days)
          </h4>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            📅 {startDate || 'Start'} to {endDate || 'End'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
          {itineraryDays.map((day, idx) => {
            const meals = day.meals || { breakfast: true, lunch: false, dinner: true };
            return (
              <div
                key={day.dayNumber || idx}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: '#0d9488',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      Day {day.dayNumber}
                    </span>
                    <input
                      type="text"
                      value={day.title || ''}
                      onChange={(e) => updateDayField(idx, 'title', e.target.value)}
                      placeholder="Day Title / Theme"
                      style={{
                        fontWeight: 700,
                        fontSize: '14px',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 8px',
                      }}
                    />
                  </div>

                  {/* Meals check */}
                  <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={meals.breakfast}
                        onChange={() => toggleMeal(idx, 'breakfast')}
                        style={{ accentColor: '#0d9488' }}
                      />
                      🥐 Breakfast
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={meals.lunch}
                        onChange={() => toggleMeal(idx, 'lunch')}
                        style={{ accentColor: '#0d9488' }}
                      />
                      🥗 Lunch
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={meals.dinner}
                        onChange={() => toggleMeal(idx, 'dinner')}
                        style={{ accentColor: '#0d9488' }}
                      />
                      🍷 Dinner
                    </label>
                  </div>
                </div>

                {/* Slots: Morning, Afternoon, Evening */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>
                      🌅 Morning Slot
                    </label>
                    <input
                      type="text"
                      value={day.morning || ''}
                      onChange={(e) => updateDayField(idx, 'morning', e.target.value)}
                      placeholder="e.g. Guided tour of museum"
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>
                      ☀️ Afternoon Slot
                    </label>
                    <input
                      type="text"
                      value={day.afternoon || ''}
                      onChange={(e) => updateDayField(idx, 'afternoon', e.target.value)}
                      placeholder="e.g. Shopping & leisure stroll"
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>
                      🌙 Evening Slot
                    </label>
                    <input
                      type="text"
                      value={day.evening || ''}
                      onChange={(e) => updateDayField(idx, 'evening', e.target.value)}
                      placeholder="e.g. Cultural show & dinner"
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

