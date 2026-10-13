import React, { useState, useEffect } from 'react';

/**
 * GuideActivityModal
 * Controlled form modal for creating or editing an itinerary activity item.
 * Preserves backend validation requirements (tripId, city, dayNumber, activity, time, activityStatus).
 * Resets cleanly upon opening, closing, or changing the edited item.
 */
export default function GuideActivityModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialData = null,
  tripId,
  defaultCity = '',
  isSubmitting = false,
  onSave,
  onClose,
}) {
  const [dayNumber, setDayNumber] = useState(1);
  const [time, setTime] = useState('09:00');
  const [city, setCity] = useState('');
  const [activity, setActivity] = useState('');
  const [activityStatus, setActivityStatus] = useState('Pending');
  const [errorMsg, setErrorMsg] = useState('');

  // Controlled form reset whenever modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setDayNumber(Number(initialData.dayNumber) || 1);
        setTime(initialData.time || '09:00');
        setCity(initialData.city || defaultCity || '');
        setActivity(initialData.activity || '');
        setActivityStatus(initialData.activityStatus || 'Pending');
      } else {
        setDayNumber(1);
        setTime('09:00');
        setCity(defaultCity || '');
        setActivity('');
        setActivityStatus('Pending');
      }
      setErrorMsg('');
    }
  }, [isOpen, mode, initialData, defaultCity]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!activity.trim()) {
      setErrorMsg('Please enter an activity description.');
      return;
    }
    if (!city.trim()) {
      setErrorMsg('Please specify a city.');
      return;
    }
    if (dayNumber < 1) {
      setErrorMsg('Day number must be at least 1.');
      return;
    }

    setErrorMsg('');
    onSave({
      tripId: Number(tripId),
      dayNumber: Number(dayNumber),
      time: time.trim() || '09:00',
      city: city.trim(),
      activity: activity.trim(),
      activityStatus,
    });
  };

  return (
    <div className="guide-modal-overlay" onClick={onClose}>
      <div className="guide-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="guide-modal-header">
          <h3 className="guide-modal-title">
            {mode === 'edit' ? '✏️ Edit Itinerary Activity' : '➕ Add Itinerary Activity'}
          </h3>
          <button type="button" className="guide-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="guide-modal-body">
          {errorMsg && (
            <div className="guide-modal-alert">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="guide-form-grid-2">
            <div className="guide-form-group">
              <label className="guide-form-label">Day Number *</label>
              <input
                type="number"
                min="1"
                max="60"
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
                className="guide-form-input"
                required
              />
            </div>

            <div className="guide-form-group">
              <label className="guide-form-label">Scheduled Time *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="guide-form-input"
                required
              />
            </div>
          </div>

          <div className="guide-form-group">
            <label className="guide-form-label">City / Destination *</label>
            <input
              type="text"
              placeholder="e.g. Paris, Tokyo, North Goa"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="guide-form-input"
              required
            />
          </div>

          <div className="guide-form-group">
            <label className="guide-form-label">Activity Description *</label>
            <textarea
              rows="3"
              placeholder="e.g. Guided walking tour through Montmartre and Basilique du Sacré-Cœur"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="guide-form-textarea"
              required
            />
          </div>

          <div className="guide-form-group">
            <label className="guide-form-label">Current Activity Status</label>
            <select
              value={activityStatus}
              onChange={(e) => setActivityStatus(e.target.value)}
              className="guide-form-select"
            >
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="guide-modal-footer">
            <button
              type="button"
              className="btn btn-secondary guide-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary guide-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : mode === 'edit'
                ? 'Save Changes'
                : 'Create Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
