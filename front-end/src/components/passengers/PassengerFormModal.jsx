import React, { useState, useEffect } from 'react';
import { passengersApi } from '../../services/api';

/**
 * PassengerFormModal: Controlled form modal for creating or editing saved co-traveler passengers.
 * Directly communicates with the NestJS backend API:
 * - POST /passengers for new passengers
 * - PATCH /passengers/:id for updates
 * Eliminates legacy reliance on browser mockData and localStorage.
 */
export default function PassengerFormModal({
  isOpen = false,
  editingPassenger = null,
  travelerId,
  onSave,
  onClose,
}) {
  const isEdit = Boolean(editingPassenger);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Female',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState(null);

  const passengerId = editingPassenger?.passId || editingPassenger?.id || null;
  const activePassengerKey = passengerId ? `edit-${passengerId}` : 'new';

  // Form lifecycle synchronization:
  // Synchronizes state and clears obsolete errors when opening or switching passenger records.
  // Unrelated parent re-renders while typing do not reset the form because activePassengerKey is stable.
  useEffect(() => {
    if (isOpen) {
      if (editingPassenger) {
        setFormData({
          name: editingPassenger.name || '',
          age: editingPassenger.age !== undefined && editingPassenger.age !== null ? String(editingPassenger.age) : '',
          gender: editingPassenger.gender || 'Female',
        });
      } else {
        setFormData({
          name: '',
          age: '',
          gender: 'Female',
        });
      }
      setErrors({});
      setBackendError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, activePassengerKey]);

  // Visibility check placed AFTER all hooks have executed unconditionally
  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Passenger name is required.';
    }

    const numAge = Number(formData.age);
    if (formData.age === '' || isNaN(numAge) || numAge < 1 || !Number.isInteger(numAge)) {
      newErrors.age = 'Age must be a positive integer (e.g., 25).';
    }

    if (!['Male', 'Female', 'Other'].includes(formData.gender)) {
      newErrors.gender = 'Please select a gender.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setBackendError(null);

    try {
      if (isEdit) {
        // Calls PATCH /passengers/:id (ownership verified by RolesGuard)
        const payload = {
          name: formData.name.trim(),
          age: Number(formData.age),
          gender: formData.gender,
        };

        const updated = await passengersApi.update(editingPassenger.passId, payload);
        onSave(updated, true);
      } else {
        // Calls POST /passengers (ownership verified by RolesGuard)
        const payload = {
          name: formData.name.trim(),
          age: Number(formData.age),
          gender: formData.gender,
          travelerId: Number(travelerId),
        };

        const created = await passengersApi.create(payload);
        onSave(created, false);
      }
      onClose();
    } catch (err) {
      console.error('[PassengerFormModal] Failed to save passenger:', err);
      setBackendError(err.message || 'Failed to save passenger to backend.');
    } finally {
      setIsSubmitting(false);
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
          maxWidth: '460px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
              {isEdit ? '✏️ Edit Saved Passenger' : '➕ Add Saved Passenger'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Master list for expedited travel itinerary and transport booking.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Server Error Banner */}
        {backendError && (
          <div
            style={{
              margin: '16px 24px 0',
              padding: '12px 16px',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '13px',
            }}
          >
            <strong>⚠️ Server Error:</strong> {backendError}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Sita Mehta"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.name ? '#ef4444' : 'var(--border)'}`,
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {errors.name && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.name}
              </span>
            )}
          </div>

          {/* Age and Gender */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Age *
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 25"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: `1.5px solid ${errors.age ? '#ef4444' : 'var(--border)'}`,
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              {errors.age && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.age}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Gender *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border)',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#fff',
                }}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 600 }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '9px 22px', fontSize: '13px', fontWeight: 700 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving to Backend...' : isEdit ? '💾 Update Passenger' : '➕ Save Passenger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
