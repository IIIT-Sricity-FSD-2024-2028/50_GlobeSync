import React, { useState, useEffect } from 'react';

/**
 * GuideSuggestItineraryModal
 * Controlled form modal for sending an itinerary suggestion as a direct message
 * to the traveler or agency contact.
 * Distinct from saving actual database itinerary changes:
 * This proposal notifies the client without corrupting or prematurely mutating
 * the live trip schedule.
 */
export default function GuideSuggestItineraryModal({
  isOpen,
  trip,
  contact,
  isSubmitting = false,
  onSend,
  onClose,
}) {
  const [dayNumber, setDayNumber] = useState('1');
  const [time, setTime] = useState('11:00');
  const [activityType, setActivityType] = useState('Sightseeing');
  const [notes, setNotes] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('0');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset form whenever modal opens or trip changes
  useEffect(() => {
    if (isOpen) {
      setDayNumber('1');
      setTime('11:00');
      setActivityType('Sightseeing');
      setNotes('');
      setEstimatedCost('0');
      setErrorMsg('');
    }
  }, [isOpen, trip?.tripId]);

  if (!isOpen || !trip) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      setErrorMsg('Please enter suggestion notes / details.');
      return;
    }

    setErrorMsg('');
    onSend({
      dayNumber,
      time: time.trim(),
      activityType,
      notes: notes.trim(),
      estimatedCost: Number(estimatedCost) || 0,
    });
  };

  return (
    <div className="guide-modal-overlay" onClick={onClose}>
      <div className="guide-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="guide-modal-header">
          <h3 className="guide-modal-title">
            ✈️ Suggest Itinerary Changes
          </h3>
          <button type="button" className="guide-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="guide-suggestion-notice">
          ℹ️ <strong>Proposal Notice:</strong> This proposal will be dispatched as a direct message to{' '}
          <strong>{contact?.name || 'the client'}</strong> for review. It does not overwrite the confirmed itinerary until accepted.
        </div>

        <form onSubmit={handleSubmit} className="guide-modal-body">
          {errorMsg && (
            <div className="guide-modal-alert">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="guide-form-grid-2">
            <div className="guide-form-group">
              <label className="guide-form-label">Proposed Day *</label>
              <select
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
                className="guide-form-select"
                required
              >
                <option value="1">Day 1</option>
                <option value="2">Day 2</option>
                <option value="3">Day 3</option>
                <option value="4">Day 4</option>
                <option value="5">Day 5</option>
                <option value="6">Day 6</option>
                <option value="7">Day 7</option>
                <option value="8">Day 8</option>
                <option value="9">Day 9</option>
                <option value="10">Day 10</option>
              </select>
            </div>

            <div className="guide-form-group">
              <label className="guide-form-label">Preferred Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="guide-form-input"
              />
            </div>
          </div>

          <div className="guide-form-group">
            <label className="guide-form-label">Activity Category *</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="guide-form-select"
              required
            >
              <option value="Sightseeing">Sightseeing</option>
              <option value="Dining">Dining</option>
              <option value="Adventure">Adventure</option>
              <option value="Cultural">Cultural</option>
              <option value="Shopping">Shopping</option>
              <option value="Transport">Transport / Transfer</option>
            </select>
          </div>

          <div className="guide-form-group">
            <label className="guide-form-label">Suggestion Details & Notes *</label>
            <textarea
              rows="3"
              placeholder="e.g. Recommended sunset cruise along the Seine or private wine tasting session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="guide-form-textarea"
              required
            />
          </div>

          <div className="guide-form-group">
            <label className="guide-form-label">Estimated Additional Cost (₹)</label>
            <input
              type="number"
              min="0"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              className="guide-form-input"
            />
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
              className="btn guide-btn-send-suggestion"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending Proposal...' : '✈️ Send Suggestion to Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
