import React, { useState, useEffect } from 'react';

/**
 * PassengerModal
 * 
 * Controlled modal for adding and updating agency-owned passengers with full profile attributes.
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
    dob: '',
    gender: 'Male',
    email: '',
    phone: '',
    idType: 'Passport',
    idNumber: '',
    specialNotes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (passenger) {
      setFormData({
        name: passenger.name || '',
        age: passenger.age ? String(passenger.age) : '',
        dob: passenger.dob || '',
        gender: passenger.gender || 'Male',
        email: passenger.email || '',
        phone: passenger.phone || '',
        idType: passenger.idType || 'Passport',
        idNumber: passenger.idNumber || '',
        specialNotes: passenger.specialNotes || '',
      });
    } else {
      setFormData({
        name: '',
        age: '',
        dob: '',
        gender: 'Male',
        email: '',
        phone: '',
        idType: 'Passport',
        idNumber: '',
        specialNotes: '',
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
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address';
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
        dob: formData.dob || undefined,
        gender: formData.gender,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        idType: formData.idType,
        idNumber: formData.idNumber.trim() || undefined,
        specialNotes: formData.specialNotes.trim() || undefined,
        agencyId: Number(agencyId),
      };

      await onSubmit(payload, passenger?.passId || passenger?.id);
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
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
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              {isEdit ? `Edit Passenger #${passenger.passId}` : 'Add Passenger to Agency Roster'}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Save offline client traveler identity for rapid itinerary booking.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
          {submitError && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              ⚠️ {submitError}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Vikram Sharma"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: errors.name ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
            {errors.name && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.name}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Age *
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="e.g. 34"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.age ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
              {errors.age && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.age}</span>}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Gender *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="passenger@example.com"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.email ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
              {errors.email && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.email}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                ID / Document Type
              </label>
              <select
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="Passport">Passport</option>
                <option value="Aadhaar">Aadhaar</option>
                <option value="Driving License">Driving License</option>
                <option value="National ID">National ID</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                ID / Document Number
              </label>
              <input
                type="text"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                placeholder="e.g. Z9876543"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Dietary, Accessibility & Special Notes
            </label>
            <textarea
              rows="2"
              value={formData.specialNotes}
              onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
              placeholder="e.g. Vegetarian meal, wheelchair assistance, aisle seat preference"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#0d9488',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Saving...' : isEdit ? '✓ Update Passenger' : '✓ Add Passenger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
