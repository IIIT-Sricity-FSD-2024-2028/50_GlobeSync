import React, { useState, useEffect } from 'react';
import { tripsApi } from '../../services/api';

/**
 * TripEditModal: Controlled form modal for updating trip details
 * Allows travelers to update destination, travel dates, budget, and trip status.
 * Note: Deletion is restricted to admin/superuser in the backend, so it is deliberately omitted here.
 */
export default function TripEditModal({ trip = null, isOpen = true, onClose, onSave }) {
  // 1. Controlled Form State - Unconditional hooks
  const [formData, setFormData] = useState({
    origin: trip?.origin || 'New Delhi, India',
    destination: trip?.destination || '',
    startDate: trip?.startDate || '',
    endDate: trip?.endDate || '',
    budget: trip?.budget ?? 0,
    status: trip?.status || 'Pending',
  });

  // 2. Field-level validation error messages
  const [errors, setErrors] = useState({});

  // 3. Network submission state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const tripId = trip?.tripId || trip?.id || null;

  // Form lifecycle synchronization:
  // Synchronizes state and clears obsolete errors when switching to a different trip or reopening.
  // Will NOT reset active user typing during unrelated parent re-renders when tripId is unchanged.
  useEffect(() => {
    if (trip && isOpen) {
      setFormData({
        origin: trip.origin || 'New Delhi, India',
        destination: trip.destination || '',
        startDate: trip.startDate || '',
        endDate: trip.endDate || '',
        budget: trip.budget ?? 0,
        status: trip.status || 'Pending',
      });
      setErrors({});
      setSaveError(null);
      setIsSaving(false);
    }
  }, [tripId, isOpen]);

  // Visibility handling: Evaluated AFTER all hooks have executed unconditionally
  if (!isOpen || !trip) {
    return null;
  }

  // Input change handler clears error on edit
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Client-side validation before sending request to backend
  const validateForm = () => {
    const newErrors = {};

    if (!formData.origin || !formData.origin.trim()) {
      newErrors.origin = 'Departure / starting city is required.';
    }

    if (!formData.destination || !formData.destination.trim()) {
      newErrors.destination = 'Destination is required.';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required.';
    } else if (isNaN(new Date(formData.startDate).getTime())) {
      newErrors.startDate = 'Please enter a valid start date.';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required.';
    } else if (isNaN(new Date(formData.endDate).getTime())) {
      newErrors.endDate = 'Please enter a valid end date.';
    } else if (formData.startDate && formData.endDate <= formData.startDate) {
      newErrors.endDate = 'End date must be strictly after start date.';
    }

    const budgetNum = Number(formData.budget);
    if (formData.budget === '' || isNaN(budgetNum) || budgetNum < 0) {
      newErrors.budget = 'Budget must be a non-negative number.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Named event handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate clicks while request is in flight
    if (isSaving) return;

    if (!validateForm()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const payload = {
        origin: formData.origin.trim(),
        destination: formData.destination.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        budget: Number(formData.budget),
        status: formData.status,
      };

      // Calls PUT /trips/:id — verified traveler endpoint
      const updatedTrip = await tripsApi.update(trip.tripId, payload);

      // Notify parent to update state with the fresh response from the backend
      onSave(updatedTrip);
    } catch (err) {
      console.error('[TripEditModal] Failed to update trip:', err);
      setSaveError(err.message || 'Failed to update trip on backend.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
              Edit Trip #{trip.tripId}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '2px' }}>
              Modify destination, dates, budget, or status for this itinerary.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--muted)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Backend Error Banner */}
          {saveError && (
            <div
              style={{
                padding: '12px 16px',
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '8px',
                color: '#991b1b',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              ⚠️ {saveError}
            </div>
          )}

          {/* Departure City (From) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              🛫 From: Departure / Starting City *
            </label>
            <input
              type="text"
              value={formData.origin}
              onChange={(e) => handleInputChange('origin', e.target.value)}
              placeholder="e.g. New Delhi, India"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.origin ? 'var(--danger, #ef4444)' : 'var(--border)'}`,
                fontSize: '14px',
              }}
            />
            {errors.origin && (
              <div style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', marginTop: '4px' }}>
                {errors.origin}
              </div>
            )}
          </div>

          {/* Destination (To) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              🛬 To: Target Destination *
            </label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => handleInputChange('destination', e.target.value)}
              placeholder="e.g. Paris, France"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.destination ? 'var(--danger, #ef4444)' : 'var(--border)'}`,
                fontSize: '14px',
              }}
            />
            {errors.destination && (
              <div style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', marginTop: '4px' }}>
                {errors.destination}
              </div>
            )}
          </div>

          {/* Travel Dates Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${errors.startDate ? 'var(--danger, #ef4444)' : 'var(--border)'}`,
                  fontSize: '14px',
                }}
              />
              {errors.startDate && (
                <div style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', marginTop: '4px' }}>
                  {errors.startDate}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${errors.endDate ? 'var(--danger, #ef4444)' : 'var(--border)'}`,
                  fontSize: '14px',
                }}
              />
              {errors.endDate && (
                <div style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', marginTop: '4px' }}>
                  {errors.endDate}
                </div>
              )}
            </div>
          </div>

          {/* Budget & Status Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Budget (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${errors.budget ? 'var(--danger, #ef4444)' : 'var(--border)'}`,
                  fontSize: '14px',
                }}
              />
              {errors.budget && (
                <div style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', marginTop: '4px' }}>
                  {errors.budget}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Trip Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border)',
                  fontSize: '14px',
                  background: '#fff',
                }}
              >
                <option value="Planning">Planning</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-light, #eee)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '8px 18px', fontSize: '13px' }}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '8px 22px',
                fontSize: '13px',
                fontWeight: 700,
                background: isSaving ? 'var(--muted)' : 'var(--primary)',
              }}
              disabled={isSaving}
            >
              {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
