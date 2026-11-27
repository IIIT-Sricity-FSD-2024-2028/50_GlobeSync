import React, { useState, useEffect, useMemo } from 'react';
import { itinerariesApi } from '../../services/api';

/**
 * GuideSuggestItineraryModal
 * Controlled form modal for creating an itinerary suggestion for a trip.
 * Persists the suggestion directly into /itineraries with suggestedBy: 'guide'
 * and suggestionStatus: 'Suggested', and sends a proposal notification message.
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
  const [persisting, setPersisting] = useState(false);

  // Compute total duration dynamically strictly using native Date math
  const totalDays = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return 1;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }, [trip?.startDate, trip?.endDate]);

  // Reset form whenever modal opens or trip changes
  useEffect(() => {
    if (isOpen) {
      setDayNumber('1');
      setTime('11:00');
      setActivityType('Sightseeing');
      setNotes('');
      setEstimatedCost('0');
      setErrorMsg('');
      setPersisting(false);
    }
  }, [isOpen, trip?.tripId]);

  if (!isOpen || !trip) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      setErrorMsg('Please enter suggestion notes / details.');
      return;
    }

    setErrorMsg('');
    setPersisting(true);

    let createdItinerary = null;
    try {
      const city = trip.destination ? trip.destination.split(',')[0].trim() : 'Destination';
      createdItinerary = await itinerariesApi.create({
        tripId: trip.tripId,
        dayNumber: Number(dayNumber),
        city,
        time: time ? time.trim() : '11:00',
        activity: notes.trim(),
        activityStatus: 'Pending',
        suggestedBy: 'guide',
        suggestionStatus: 'Suggested',
        notes: notes.trim(),
        estimatedCost: Number(estimatedCost) || 0,
      });
    } catch (err) {
      console.warn('Failed to persist suggestion via itineraries API:', err);
      // We still propagate proposal message
    } finally {
      setPersisting(false);
    }

    if (onSend) {
      onSend({
        dayNumber,
        time: time.trim(),
        activityType,
        notes: notes.trim(),
        estimatedCost: Number(estimatedCost) || 0,
        createdItinerary,
      });
    }
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
          ℹ️ <strong>Proposal Notice:</strong> This proposal will be saved as a pending suggestion for the trip and dispatched as a direct message to{' '}
          <strong>{contact?.name || 'the client/agency'}</strong> for review.
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
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>
                    Day {d}
                  </option>
                ))}
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
              disabled={isSubmitting || persisting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn guide-btn-send-suggestion"
              disabled={isSubmitting || persisting}
            >
              {isSubmitting || persisting ? 'Submitting Proposal...' : '✈️ Send Suggestion to Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
