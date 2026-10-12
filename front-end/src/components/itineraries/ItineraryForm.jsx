import React, { useState, useEffect } from 'react';
import { itinerariesApi } from '../../services/api';

/**
 * ItineraryForm: Controlled form component for adding and editing itinerary entries
 * for a selected traveler-owned trip.
 *
 * Props:
 * - selectedTrip: The active trip object (provides tripId, destination, and context)
 * - editingItem: The existing itinerary object being edited, or null when creating a new activity
 * - onSave: Callback invoked with (savedItem, isEdit) upon successful backend response
 * - onCancel: Callback to dismiss the form or cancel editing
 */
export default function ItineraryForm({
  selectedTrip,
  editingItem = null,
  onSave,
  onCancel,
}) {
  const isEdit = Boolean(editingItem);

  // Controlled Form State
  // Pre-fills with editingItem values when editing, or sensible defaults based on selectedTrip
  const [formData, setFormData] = useState({
    dayNumber: editingItem?.dayNumber ?? 1,
    city: editingItem?.city || selectedTrip?.destination || '',
    activity: editingItem?.activity || '',
    time: editingItem?.time || '09:00',
    activityStatus: editingItem?.activityStatus || 'Pending',
  });

  // Client-side validation errors
  const [errors, setErrors] = useState({});

  // Network submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Unique identifier for the active record and trip context
  const editingId = editingItem?.itineraryId || editingItem?.id || null;
  const tripId = selectedTrip?.tripId || selectedTrip?.id || null;
  const activeRecordKey = editingId ? `edit-${editingId}` : `new-${tripId}`;

  // Form lifecycle synchronization:
  // Synchronizes state and clears obsolete errors when switching between items or trips.
  // Unrelated parent re-renders while typing do not reset the form because activeRecordKey is stable.
  useEffect(() => {
    if (editingItem) {
      setFormData({
        dayNumber: editingItem.dayNumber ?? 1,
        city: editingItem.city || selectedTrip?.destination || '',
        activity: editingItem.activity || '',
        time: editingItem.time || '09:00',
        activityStatus: editingItem.activityStatus || 'Pending',
      });
    } else {
      setFormData({
        dayNumber: 1,
        city: selectedTrip?.destination || '',
        activity: '',
        time: '09:00',
        activityStatus: 'Pending',
      });
    }
    setErrors({});
    setBackendError(null);
    setIsSubmitting(false);
  }, [activeRecordKey]);

  // Named Handler: Controlled input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error when user edits the field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Client-side validation enforcing CreateItineraryDto rules
  const validateForm = () => {
    const newErrors = {};

    const dayNum = Number(formData.dayNumber);
    if (!formData.dayNumber || isNaN(dayNum) || dayNum < 1 || !Number.isInteger(dayNum)) {
      newErrors.dayNumber = 'Day number must be a positive integer (e.g., 1, 2, 3).';
    }

    if (!formData.city || !formData.city.trim()) {
      newErrors.city = 'City or location is required.';
    }

    if (!formData.activity || !formData.activity.trim()) {
      newErrors.activity = 'Activity description is required.';
    }

    if (!formData.time || !formData.time.trim()) {
      newErrors.time = 'Scheduled time is required (e.g., 09:30 or 14:00).';
    }

    if (!['Pending', 'Confirmed', 'Completed'].includes(formData.activityStatus)) {
      newErrors.activityStatus = 'Status must be Pending, Confirmed, or Completed.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Named Handler: Submit form through backend API
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate clicks while request is in flight
    if (isSubmitting) return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    setBackendError(null);

    const tripId = Number(selectedTrip?.tripId || selectedTrip?.id);

    try {
      if (isEdit) {
        // Calls PUT /itineraries/:id (ownership verified by backend RolesGuard)
        const payload = {
          tripId,
          city: formData.city.trim(),
          dayNumber: Number(formData.dayNumber),
          activity: formData.activity.trim(),
          time: formData.time.trim(),
          activityStatus: formData.activityStatus,
        };

        const updated = await itinerariesApi.update(editingItem.itineraryId, payload);
        onSave(updated, true);
      } else {
        // Calls POST /itineraries (ownership verified by backend RolesGuard)
        const payload = {
          tripId,
          city: formData.city.trim(),
          dayNumber: Number(formData.dayNumber),
          activity: formData.activity.trim(),
          time: formData.time.trim(),
          activityStatus: formData.activityStatus,
        };

        const created = await itinerariesApi.create(payload);
        onSave(created, false);
      }
    } catch (err) {
      console.error('[ItineraryForm] Failed to save itinerary:', err);
      // Handles 400 Bad Request, 403 Forbidden ownership rejections, etc.
      setBackendError(err.message || 'Failed to save itinerary item to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1.5px solid var(--border)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      {/* Form Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '18px',
          borderBottom: '1px solid var(--border-light, #eee)',
          paddingBottom: '12px',
        }}
      >
        <div>
          <h4 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {isEdit ? '✏️ Edit Itinerary Activity' : '➕ Add New Itinerary Activity'}
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
            Trip #{selectedTrip?.tripId}: {selectedTrip?.destination}
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Cancel"
          >
            ✕
          </button>
        )}
      </div>

      {/* Backend Error Banner */}
      {backendError && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '10px',
            color: '#991b1b',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          <strong>⚠️ Server Error:</strong> {backendError}
        </div>
      )}

      {/* Controlled Form */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {/* Day Number */}
          <div>
            <label
              htmlFor="itin-dayNumber"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
            >
              Day Number *
            </label>
            <input
              id="itin-dayNumber"
              type="number"
              min="1"
              step="1"
              value={formData.dayNumber}
              onChange={(e) => handleInputChange('dayNumber', e.target.value)}
              placeholder="e.g. 1"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.dayNumber ? '#ef4444' : 'var(--border)'}`,
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {errors.dayNumber && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.dayNumber}
              </span>
            )}
          </div>

          {/* Time */}
          <div>
            <label
              htmlFor="itin-time"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
            >
              Time / Schedule *
            </label>
            <input
              id="itin-time"
              type="text"
              value={formData.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
              placeholder="e.g. 09:30 or 15:00"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.time ? '#ef4444' : 'var(--border)'}`,
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {errors.time && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.time}
              </span>
            )}
          </div>

          {/* City / Location */}
          <div>
            <label
              htmlFor="itin-city"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
            >
              City / Location *
            </label>
            <input
              id="itin-city"
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="e.g. Paris, Eiffel Tower District"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.city ? '#ef4444' : 'var(--border)'}`,
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {errors.city && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.city}
              </span>
            )}
          </div>

          {/* Activity Status */}
          <div>
            <label
              htmlFor="itin-status"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
            >
              Activity Status
            </label>
            <select
              id="itin-status"
              value={formData.activityStatus}
              onChange={(e) => handleInputChange('activityStatus', e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--border)',
                fontSize: '14px',
                outline: 'none',
                background: '#fff',
              }}
            >
              <option value="Pending">Pending (Draft / Unscheduled)</option>
              <option value="Confirmed">Confirmed (Booked / Ready)</option>
              <option value="Completed">Completed (Finished)</option>
            </select>
          </div>
        </div>

        {/* Activity Description */}
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="itin-activity"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
          >
            Activity Description *
          </label>
          <input
            id="itin-activity"
            type="text"
            value={formData.activity}
            onChange={(e) => handleInputChange('activity', e.target.value)}
            placeholder="e.g. Guided tour of the Louvre Museum and Mona Lisa viewing"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `1.5px solid ${errors.activity ? '#ef4444' : 'var(--border)'}`,
              fontSize: '14px',
              outline: 'none',
            }}
          />
          {errors.activity && (
            <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              {errors.activity}
            </span>
          )}
        </div>

        {/* Actions Row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving to Backend...' : isEdit ? '💾 Update Activity' : '➕ Save Activity'}
          </button>
        </div>
      </form>
    </div>
  );
}
