import React, { useState, useEffect } from 'react';

/**
 * PassengerModal
 * 
 * Controlled modal for adding and updating agency-owned passengers.
 * Enforces field validations and agency ownership scoping.
 */
export default function PassengerModal({
  isOpen,
  passenger = null,
  agencyId,
  onClose,
  onSubmit,
}) {
  const isEdit = Boolean(passenger);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (passenger) {
      setFormData({
        name: passenger.name || '',
        age: passenger.age ? String(passenger.age) : '',
        gender: passenger.gender || 'Male',
      });
    } else {
      setFormData({
        name: '',
        age: '',
        gender: 'Male',
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [passenger, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Passenger full name is required';
    }
    const ageNum = parseInt(formData.age, 10);
    if (!formData.age || isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      errs.age = 'Please enter a valid age between 1 and 120';
    }
    if (!formData.gender) {
      errs.gender = 'Gender is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        agencyId: Number(agencyId),
      };

      await onSubmit(payload, passenger?.passId);
      onClose();
    } catch (err) {
      console.error('Passenger submit error:', err);
      setSubmitError(err.message || 'Failed to save passenger details. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
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
          maxWidth: '500px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-light, #eee)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-soft, #fafafa)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {isEdit ? `Edit Passenger #${passenger.passId}` : 'Add New Client Passenger 👥'}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              Scoped to agency #{agencyId} roster
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {submitError && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fee2e2',
                color: '#b91c1c',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              ⚠️ {submitError}
            </div>
          )}

          {/* Full Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
              }}
              placeholder="e.g. Rahul Sharma"
              className="form-control"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.name ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            />
            {errors.name && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.name}
              </span>
            )}
          </div>

          {/* Age & Gender */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Age *
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={formData.age}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, age: e.target.value }));
                  if (errors.age) setErrors((prev) => ({ ...prev, age: null }));
                }}
                placeholder="e.g. 28"
                className="form-control"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: errors.age ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              {errors.age && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.age}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Gender *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                className="form-control"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
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
              disabled={submitting}
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '10px 18px', fontSize: '14px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                padding: '10px 22px',
                fontSize: '14px',
                background: 'linear-gradient(135deg, #19b6a6 0%, #0ea5e9 100%)',
                border: 'none',
                fontWeight: 700,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Saving...' : (isEdit ? 'Update Passenger ✓' : 'Add Passenger ✓')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
