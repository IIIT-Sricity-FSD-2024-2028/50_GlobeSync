import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { supportUsersApi } from '../../services/api';

/**
 * SupportProfilePage
 * 
 * Manages personal identity information for customer support specialists.
 * Explicitly updates permitted fields (name, email, contact) and respects immutable security policies.
 */
export default function SupportProfilePage() {
  const { user, updateUser } = useSession();
  const careId = Number(user?.careId || user?.care_id || user?.id || 1);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    contact: user?.contact || '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await supportUsersApi.getById(careId);
        if (isMounted && data) {
          setFormData({
            name: data.name || '',
            email: data.email || '',
            contact: data.contact || '',
          });
        }
      } catch (err) {
        if (isMounted) {
          // If profile fetch fails, fallback gracefully to session user
          console.warn('Could not load remote support profile, using session data:', err);
          setFormData({
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.contact || '',
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [careId, user]);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please provide a valid email address';
    }
    if (!formData.contact.trim()) {
      errs.contact = 'Contact phone number is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || saving) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        contact: formData.contact.trim(),
      };

      const updated = await supportUsersApi.update(careId, payload);

      // Synchronize session state so header and sidebar update immediately
      updateUser({
        name: updated?.name || payload.name,
        email: updated?.email || payload.email,
        contact: updated?.contact || payload.contact,
      });

      setSuccessMessage('Profile details saved successfully! ✅');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update support user profile:', err);
      setErrorMessage(err.message || 'Failed to update profile. Please verify your entries.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Top Welcome */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          border: '1px solid var(--border)',
        }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Support Agent Profile Settings 👤
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Manage your personal desk contact information and agent identity.
        </p>
      </div>

      {successMessage && (
        <div
          style={{
            padding: '14px 18px',
            background: '#ecfdf5',
            color: '#065f46',
            borderRadius: '12px',
            border: '1px solid #a7f3d0',
            marginBottom: '20px',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '14px 18px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '12px',
            border: '1px solid #fecaca',
            marginBottom: '20px',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Identity Summary Card */}
        <div
          className="card"
          style={{
            borderRadius: '16px',
            overflow: 'hidden',
            padding: 0,
            textAlign: 'center',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              height: '110px',
              background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
            }}
          />

          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: '#fff',
              border: '4px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 800,
              color: '#10b981',
              margin: '-42px auto 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {formData.name ? formData.name[0] : 'S'}
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formData.name || 'Support Agent'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              {formData.email}
            </div>
            <div
              style={{
                display: 'inline-block',
                marginTop: '12px',
                padding: '4px 14px',
                borderRadius: '16px',
                background: '#ecfdf5',
                color: '#059669',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid #a7f3d0',
              }}
            >
              🎧 Customer Care Specialist
            </div>

            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9',
                textAlign: 'left',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Care ID:</span>
                <span style={{ fontWeight: 700 }}>#{careId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Desk Status:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>● Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Role Access:</span>
                <span style={{ fontWeight: 600 }}>Role.SUPPORT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form & Security Policies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Form Card */}
          <div className="card" style={{ padding: '28px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px' }}>
              Personal & Contact Information
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px' }}>
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
                  disabled={loading || saving}
                  placeholder="e.g. Aisha Khan"
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, email: e.target.value }));
                      if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    }}
                    disabled={loading || saving}
                    placeholder="e.g. aisha@globesync.com"
                    className="form-control"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: errors.email ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '14px',
                    }}
                  />
                  {errors.email && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {errors.email}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, contact: e.target.value }));
                      if (errors.contact) setErrors((prev) => ({ ...prev, contact: null }));
                    }}
                    disabled={loading || saving}
                    placeholder="e.g. 9001122334"
                    className="form-control"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: errors.contact ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '14px',
                    }}
                  />
                  {errors.contact && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {errors.contact}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={loading || saving}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    padding: '12px 28px',
                    fontWeight: 700,
                    fontSize: '14px',
                    borderRadius: '10px',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving Changes...' : 'Save Profile Changes ✓'}
                </button>
              </div>
            </form>
          </div>

          {/* Security & Access Policies Card */}
          <div
            className="card"
            style={{
              padding: '20px 24px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>🔒</span>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Security & Credential Policy Notice
              </h4>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>
              The <code>/support-users/:id</code> endpoint strictly supports personal identity updates (name, email, contact phone). 
              In compliance with platform RBAC security rules, password modifications and role permissions cannot be altered through this form. 
              If credential reset or role reassignment is needed, submit an administrative ticket to the Superuser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
