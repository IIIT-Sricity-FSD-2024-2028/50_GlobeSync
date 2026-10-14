import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { agenciesApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';

/**
 * AgencyProfilePage
 * 
 * Manages travel agency partner details, verified business identity,
 * and contract commission attributes.
 */
export default function AgencyProfilePage() {
  const { user, updateUser } = useSession();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [agencyData, setAgencyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Controlled form state
  const [businessName, setBusinessName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI state
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const loadProfile = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await agenciesApi.getById(agencyId, { signal });
      if (!signal?.aborted && data) {
        setAgencyData(data);
        setBusinessName(data.businessName || data.name || '');
        setContactEmail(data.contactEmail || data.email || '');
        setContactPhone(data.contactPhone || data.phone || '');
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Failed to load agency profile:', err);
        setError(err.message || 'Failed to load profile details.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (agencyId) {
      loadProfile(controller.signal);
    }
    return () => controller.abort();
  }, [agencyId]);

  const validate = () => {
    const errs = {};
    if (!businessName.trim()) {
      errs.businessName = 'Business name is required.';
    }
    if (!contactEmail.trim()) {
      errs.contactEmail = 'Contact email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      errs.contactEmail = 'Please enter a valid email address.';
    }
    if (!contactPhone.trim()) {
      errs.contactPhone = 'Contact phone number is required.';
    }
    if (newPassword && newPassword.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSaveError(null);

    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        businessName: businessName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
      };
      if (newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      const updated = await agenciesApi.update(agencyId, payload);
      setAgencyData(updated);
      setSaveSuccess(true);
      setNewPassword('');

      // Propagate into active session context
      if (updateUser) {
        updateUser({
          ...user,
          businessName: updated.businessName,
          name: updated.businessName,
          contactEmail: updated.contactEmail,
          email: updated.contactEmail,
        });
      }
    } catch (err) {
      console.error('Profile update failed:', err);
      setSaveError(err.message || 'Failed to save agency profile updates.');
    } finally {
      setSaving(false);
    }
  };

  const commissionRateDisplay =
    agencyData?.commissionRate !== undefined && agencyData?.commissionRate !== null
      ? `${agencyData.commissionRate}%`
      : user?.commissionRate !== undefined && user?.commissionRate !== null
      ? `${user.commissionRate}%`
      : '1.5%';

  return (
    <div className="agency-profile-page" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
          Agency Profile & Settings
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
          Manage your verified business credentials, partner contacts, and view your contract terms.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Loading profile...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
          <p style={{ margin: '0 0 16px 0', fontWeight: 600 }}>{error}</p>
          <button
            type="button"
            onClick={() => loadProfile()}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#fff', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Left: Overview Card */}
          <div>
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                padding: '28px',
                textAlign: 'center',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                  color: '#fff',
                  fontSize: '32px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  boxShadow: '0 4px 12px rgba(13,148,136,0.25)',
                }}
              >
                {(businessName || 'A').charAt(0).toUpperCase()}
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                {businessName || 'Agency Partner'}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
                {contactEmail || 'No email provided'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Partner ID:</span>
                  <strong style={{ color: '#0f172a' }}>#{agencyId}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Account Status:</span>
                  <StatusBadge status={agencyData?.status || 'approved'} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Contract Commission:</span>
                  <span
                    style={{
                      background: '#f0fdfa',
                      border: '1px solid #99f6e4',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      color: '#0d9488',
                      fontWeight: 800,
                      fontSize: '13px',
                    }}
                  >
                    {commissionRateDisplay}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Member Since:</span>
                  <span style={{ color: '#475569', fontSize: '13px' }}>
                    {agencyData?.createdAt ? new Date(agencyData.createdAt).toLocaleDateString() : 'Active Partner'}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                fontSize: '13px',
                color: '#64748b',
                lineHeight: 1.5,
              }}
            >
              🔒 <strong>Rate Lock Policy:</strong> Contract commission rates are negotiated and administered by platform
              administrators. If you require a commission review or higher reseller quota, please submit a ticket via the{' '}
              <a href="/agency/support" style={{ color: '#0d9488', fontWeight: 600, textDecoration: 'underline' }}>
                Support Desk
              </a>.
            </div>
          </div>

          {/* Right: Editable Form Card */}
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              padding: '28px',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 20px 0', color: '#0f172a' }}>
              Business Profile Details
            </h3>

            {saveSuccess && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#166534',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '20px',
                }}
              >
                ✓ Profile details successfully updated and saved to backend!
              </div>
            )}

            {saveError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '20px',
                }}
              >
                ⚠️ {saveError}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Registered Business Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Horizon Travel Partners"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: fieldErrors.businessName ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.businessName && (
                  <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.businessName}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Primary Contact Email *
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. ops@horizontravel.com"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: fieldErrors.contactEmail ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.contactEmail && (
                  <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.contactEmail}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Contact Phone / Hotline *
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: fieldErrors.contactPhone ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.contactPhone && (
                  <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.contactPhone}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Update Password (optional)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: fieldErrors.password ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.password && (
                  <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.password}
                  </span>
                )}
                <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Minimum 6 characters. Only supply if you wish to change your agency login credentials.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '11px 26px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(13,148,136,0.25)',
                  }}
                >
                  {saving ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
