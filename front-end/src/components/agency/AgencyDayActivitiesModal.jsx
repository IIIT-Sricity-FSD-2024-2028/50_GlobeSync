import React, { useState, useEffect, useMemo } from 'react';
import { itinerariesApi } from '../../services/api';

/**
 * AgencyDayActivitiesModal
 * 
 * Day-Wise Activities Manager for booked trips.
 * Features:
 * - Load activities via GET /itineraries/trip/:tripId
 * - Compute Day 1..N strictly from trip.startDate to trip.endDate
 * - Add (POST), Edit (PUT), and Delete (DELETE) day-wise activities
 * - Review and Approve/Reject pending Guide Suggestions
 */
export default function AgencyDayActivitiesModal({
  isOpen,
  trip,
  onClose,
  onSuccess,
  showToast,
}) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);

  // Form state for Add / Edit
  const [editingId, setEditingId] = useState(null);
  const [formDayNumber, setFormDayNumber] = useState(1);
  const [formTime, setFormTime] = useState('10:00');
  const [formActivity, setFormActivity] = useState('');
  const [formCity, setFormCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionProcessingId, setActionProcessingId] = useState(null);

  // Calculate duration and total days strictly using native JS Date math
  const totalDays = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return 1;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }, [trip?.startDate, trip?.endDate]);

  const getDayDateLabel = (dayNum) => {
    if (!trip?.startDate) return `Day ${dayNum}`;
    const d = new Date(trip.startDate);
    d.setDate(d.getDate() + (dayNum - 1));
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const loadActivities = async () => {
    if (!trip?.tripId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await itinerariesApi.getByTrip(trip.tripId);
      const list = Array.isArray(data) ? data : data?.data || [];
      setActivities(list);
    } catch (err) {
      console.error('Failed to load itineraries:', err);
      setError(err.message || 'Failed to load day-wise activities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && trip?.tripId) {
      loadActivities();
      setSelectedDay(1);
      setFormDayNumber(1);
      setFormTime('10:00');
      setFormActivity('');
      setFormCity(trip.destination ? trip.destination.split(',')[0].trim() : '');
      setEditingId(null);
    }
  }, [isOpen, trip?.tripId]);

  if (!isOpen || !trip) return null;
  const isReadOnly = trip.status === 'Cancelled' || trip.status === 'Completed';

  // Split activities into pending suggestions and scheduled activities
  const pendingGuideSuggestions = activities.filter(
    (a) => a.suggestedBy === 'guide' && a.suggestionStatus === 'Suggested'
  );

  const scheduledActivities = activities.filter(
    (a) => a.suggestionStatus !== 'Suggested' && a.suggestionStatus !== 'Rejected'
  );

  const dayActivities = scheduledActivities
    .filter((a) => Number(a.dayNumber) === Number(selectedDay))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const handleResetForm = () => {
    setEditingId(null);
    setFormDayNumber(selectedDay);
    setFormTime('10:00');
    setFormActivity('');
    setFormCity(trip.destination ? trip.destination.split(',')[0].trim() : '');
    setError(null);
  };

  const handleSelectDay = (dayNum) => {
    setSelectedDay(dayNum);
    if (!editingId) {
      setFormDayNumber(dayNum);
    }
  };

  const handleStartEdit = (act) => {
    setEditingId(act.itineraryId);
    setFormDayNumber(act.dayNumber || selectedDay);
    setFormTime(act.time || '10:00');
    setFormActivity(act.activity || '');
    setFormCity(act.city || '');
    setError(null);
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!formActivity.trim()) {
      setError('Please enter an activity description.');
      return;
    }
    const dayNum = Number(formDayNumber);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > totalDays) {
      setError(`Day number must be between 1 and ${totalDays}.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        // Edit existing
        const updated = await itinerariesApi.update(editingId, {
          dayNumber: dayNum,
          time: formTime || '10:00',
          activity: formActivity.trim(),
          city: formCity.trim() || trip.destination?.split(',')[0]?.trim() || 'Destination',
        });
        setActivities((prev) =>
          prev.map((a) => (a.itineraryId === editingId ? { ...a, ...updated } : a))
        );
        if (showToast) showToast('Activity updated successfully! ✓');
      } else {
        // Add new
        const created = await itinerariesApi.create({
          tripId: trip.tripId,
          dayNumber: dayNum,
          time: formTime || '10:00',
          activity: formActivity.trim(),
          city: formCity.trim() || trip.destination?.split(',')[0]?.trim() || 'Destination',
          activityStatus: 'Confirmed',
          suggestedBy: 'agency',
          suggestionStatus: 'Approved',
        });
        setActivities((prev) => [...prev, created]);
        if (showToast) showToast('New activity added to itinerary! ✓');
      }
      handleResetForm();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to save activity:', err);
      setError(err.message || 'Failed to save activity.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    setActionProcessingId(id);
    try {
      await itinerariesApi.delete(id);
      setActivities((prev) => prev.filter((a) => a.itineraryId !== id));
      if (editingId === id) handleResetForm();
      if (showToast) showToast('Activity deleted. ✓');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to delete activity:', err);
      setError(err.message || 'Failed to delete activity.');
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleApproveSuggestion = async (suggestion) => {
    setActionProcessingId(suggestion.itineraryId);
    try {
      const updated = await itinerariesApi.update(suggestion.itineraryId, {
        suggestionStatus: 'Approved',
        activityStatus: 'Confirmed',
      });
      setActivities((prev) =>
        prev.map((a) => (a.itineraryId === suggestion.itineraryId ? { ...a, ...updated } : a))
      );
      if (showToast) showToast(`Guide suggestion for Day ${suggestion.dayNumber} approved! ✓`);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to approve suggestion:', err);
      setError(err.message || 'Failed to approve suggestion.');
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleRejectSuggestion = async (suggestion) => {
    setActionProcessingId(suggestion.itineraryId);
    try {
      const updated = await itinerariesApi.update(suggestion.itineraryId, {
        suggestionStatus: 'Rejected',
      });
      setActivities((prev) =>
        prev.map((a) => (a.itineraryId === suggestion.itineraryId ? { ...a, ...updated } : a))
      );
      if (showToast) showToast('Guide suggestion rejected.');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to reject suggestion:', err);
      setError(err.message || 'Failed to reject suggestion.');
    } finally {
      setActionProcessingId(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📅</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Day-Wise Activities Manager
              </h3>
              <span
                style={{
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                Trip #{trip.tripId} · {trip.status}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              📍 <strong>{trip.destination}</strong> · 🗓️ {trip.startDate || 'N/A'} to {trip.endDate || 'N/A'} ({totalDays} Days)
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {isReadOnly && (
            <div
              style={{
                background: '#f8fafc',
                color: '#334155',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
              }}
            >
              🔒 Historical Itinerary ({trip.status}) — Activities are preserved in read-only mode and cannot be modified.
            </div>
          )}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                border: '1px solid #fecaca',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Pending Guide Suggestions Section */}
          {pendingGuideSuggestions.length > 0 && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>💡</span>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#92400e' }}>
                    Pending Guide Suggestions ({pendingGuideSuggestions.length})
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#b45309' }}>
                  Proposals submitted by assigned guide for client review
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingGuideSuggestions.map((sug) => (
                  <div
                    key={sug.itineraryId}
                    style={{
                      background: '#ffffff',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      border: '1px solid #fef3c7',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            background: '#fde68a',
                            color: '#92400e',
                            fontWeight: 700,
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          Day {sug.dayNumber} · {sug.time || 'Flexible'}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                          {sug.activity}
                        </span>
                      </div>
                      {sug.notes && sug.notes !== sug.activity && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          📝 {sug.notes}
                        </div>
                      )}
                      {sug.estimatedCost ? (
                        <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                          Est. Additional Cost: ₹{Number(sug.estimatedCost).toLocaleString('en-IN')}
                        </div>
                      ) : null}
                    </div>

                    {!isReadOnly && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleApproveSuggestion(sug)}
                          disabled={actionProcessingId === sug.itineraryId}
                          style={{
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectSuggestion(sug)}
                          disabled={actionProcessingId === sug.itineraryId}
                          style={{
                            background: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day Navigation Tabs */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
              Select Itinerary Day:
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '8px',
              }}
            >
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                const count = scheduledActivities.filter((a) => Number(a.dayNumber) === d).length;
                const isSelected = selectedDay === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectDay(d)}
                    style={{
                      background: isSelected ? '#0d9488' : '#f8fafc',
                      color: isSelected ? '#ffffff' : '#334155',
                      border: isSelected ? '1px solid #0d9488' : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '95px',
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '13px' }}>Day {d}</span>
                    <span style={{ fontSize: '11px', opacity: 0.9 }}>{getDayDateLabel(d)}</span>
                    <span
                      style={{
                        marginTop: '4px',
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                        color: isSelected ? '#ffffff' : '#475569',
                        fontWeight: 700,
                      }}
                    >
                      {count} {count === 1 ? 'activity' : 'activities'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activities List for Selected Day */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                Day {selectedDay} Schedule ({getDayDateLabel(selectedDay)})
              </h4>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {dayActivities.length} {dayActivities.length === 1 ? 'entry' : 'entries'} planned
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>
                Loading day activities...
              </div>
            ) : dayActivities.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px',
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: '13px',
                }}
              >
                No activities planned for Day {selectedDay} yet. Use the form below to add one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dayActivities.map((act) => (
                  <div
                    key={act.itineraryId}
                    style={{
                      background: '#ffffff',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          background: '#f1f5f9',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#334155',
                          minWidth: '60px',
                          textAlign: 'center',
                        }}
                      >
                        🕒 {act.time || '10:00'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                            {act.activity}
                          </span>
                          {act.city && (
                            <span
                              style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              📍 {act.city}
                            </span>
                          )}
                          {act.suggestedBy === 'guide' && (
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#166534',
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}
                            >
                              ✓ Guide Approved
                            </span>
                          )}
                        </div>
                        {act.notes && act.notes !== act.activity && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {act.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isReadOnly && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(act)}
                          style={{
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(act.itineraryId)}
                          disabled={actionProcessingId === act.itineraryId}
                          style={{
                            background: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add / Edit Activity Form */}
          {!isReadOnly && (
          <form
            onSubmit={handleSaveActivity}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                {editingId ? '✏️ Edit Scheduled Activity' : `➕ Add Activity to Day ${selectedDay}`}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Day Number *
                </label>
                <select
                  value={formDayNumber}
                  onChange={(e) => setFormDayNumber(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    background: '#fff',
                  }}
                  required
                >
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Day {d} ({getDayDateLabel(d)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Time *
                </label>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  City / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paris"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Activity Description *
              </label>
              <input
                type="text"
                placeholder="e.g. Guided tour of the Louvre Museum & Tuileries Garden"
                value={formActivity}
                onChange={(e) => setFormActivity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Saving...' : editingId ? 'Update Activity' : 'Add Activity'}
              </button>
            </div>
          </form>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            ℹ️ All day-wise activities sync live to the allotted tour guide's portal.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
