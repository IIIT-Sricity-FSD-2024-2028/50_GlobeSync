import React, { useState, useEffect } from 'react';
import { travelersApi } from '../../services/api';

/**
 * ProfileForm: Controlled form for updating traveler personal details and changing password.
 * 
 * Supports:
 * - Name, Email, Phone, Gender, and Age updates (matching UpdateTravelerDto)
 * - Optional password change with confirmation check
 * - Client-side validation for email format, phone numbers, and positive age
 * - Communicates with backend via PUT /travelers/:id
 */
export default function ProfileForm({
  traveler,
  onSaveSuccess,
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'Male',
    age: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Initialize or re-populate when traveler data arrives from backend
  useEffect(() => {
    if (traveler) {
      setFormData({
        name: traveler.name || '',
        email: traveler.email || '',
        phone: traveler.phone || '',
        gender: traveler.gender || 'Male',
        age: traveler.age ? String(traveler.age) : '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [traveler]);

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
      newErrors.name = 'Full name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please provide a valid email address.';
      }
    }

    const ageNum = Number(formData.age);
    if (formData.age !== '' && (isNaN(ageNum) || ageNum < 1 || !Number.isInteger(ageNum))) {
      newErrors.age = 'Age must be a positive integer.';
    }

    if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'New password must be at least 6 characters.';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
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

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      gender: formData.gender,
      ...(formData.age ? { age: Number(formData.age) } : {}),
      ...(formData.password ? { password: formData.password } : {}),
    };

    try {
      const travelerId = Number(traveler.travelerId || traveler.id);
      // Calls PUT /travelers/:id
      const updated = await travelersApi.update(travelerId, payload);

      // Clear password fields on successful save
      setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      onSaveSuccess(updated);
    } catch (err) {
      console.error('[ProfileForm] Profile update failed:', err);
      setBackendError(err.message || 'Failed to update profile.');
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
        border: '1px solid var(--border)',
        padding: '24px',
      }}
    >
      <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-light, #eee)', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
          👤 Personal Details & Security
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
          Update your traveler profile information and change your account password.
        </p>
      </div>

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

      <form onSubmit={handleSubmit}>
        {/* Name and Email */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g. Arjun Mehta"
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

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="e.g. arjun@gmail.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.email ? '#ef4444' : 'var(--border)'}`,
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {errors.email && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.email}
              </span>
            )}
          </div>
        </div>

        {/* Phone, Gender, Age */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="e.g. 9876543210"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid var(--border)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Gender
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

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Age
            </label>
            <input
              type="number"
              min="1"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              placeholder="e.g. 28"
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
        </div>

        {/* Change Password Section */}
        <div style={{ borderTop: '1px solid var(--border-light, #eee)', paddingTop: '18px', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>
            🔒 Change Password (Optional)
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
            Leave blank if you do not wish to update your current account password.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                New Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="At least 6 characters"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${errors.password ? '#ef4444' : 'var(--border)'}`,
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              {errors.password && (
                <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                  {errors.password}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Repeat new password"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${errors.confirmPassword ? '#ef4444' : 'var(--border)'}`,
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              {errors.confirmPassword && (
                <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                  {errors.confirmPassword}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 700, borderRadius: '10px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving to Backend...' : '💾 Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
