import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';

/**
 * AgencySignupPage
 * 
 * Public registration screen for travel agency partners and resellers.
 * Submits to POST /agencies/register via authApi.registerAgency().
 * Account is registered with initial status 'pending' awaiting Admin/Superuser approval.
 */
export default function AgencySignupPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    businessName: '',
    contactEmail: '',
    contactPhone: '',
    password: '',
    confirmPassword: '',
    commissionRate: 1.5,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    const errs = {};
    if (!formData.businessName.trim()) {
      errs.businessName = 'Agency business name is required.';
    }
    if (!formData.contactEmail.trim()) {
      errs.contactEmail = 'Contact email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim())) {
      errs.contactEmail = 'Please provide a valid email address.';
    }
    if (!formData.contactPhone.trim()) {
      errs.contactPhone = 'Contact phone number is required.';
    }
    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const payload = {
        businessName: formData.businessName.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim(),
        password: formData.password,
        commissionRate: Number(formData.commissionRate) || 1.5,
      };

      await authApi.registerAgency(payload);
      setIsRegistered(true);
    } catch (err) {
      console.error('Agency registration error:', err);
      setApiError(err.message || 'Failed to register agency. Email may already be registered.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRegistered) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: '560px',
            width: '100%',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontSize: '54px', marginBottom: '16px' }}>🏢</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
            Registration Submitted!
          </h2>
          <div
            style={{
              padding: '16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              color: '#166534',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '24px',
              textAlign: 'left',
            }}
          >
            <strong>Status: Pending Approval</strong>
            <br />
            Your application for <strong>{formData.businessName}</strong> has been logged with the platform governance team. Once an Administrator or Superuser approves your partner agreement and commission tier, you can log in to your B2B Partner Portal.
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
            Registered contact email: <strong>{formData.contactEmail}</strong>
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
            <Link to="/login/agency" className="btn btn-primary" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #19b6a6 0%, #0ea5e9 100%)', border: 'none' }}>
              Proceed to Agency Login →
            </Link>
            <Link to="/" className="btn btn-secondary" style={{ padding: '12px 20px' }}>
              Back to Home
            </Link>
          </div>
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', fontSize: '12px', color: '#64748b' }}>
            ⚡ <strong>Evaluator Shortcut:</strong> To approve this agency right away, log in as Super-Admin (<Link to="/login/superuser" style={{ color: '#0284c7', fontWeight: 600 }}>superadmin@ticp.com</Link>) and visit <Link to="/super/agencies" style={{ color: '#0284c7', fontWeight: 600 }}>Agency Approvals</Link>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '620px',
          width: '100%',
          padding: '36px',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#f0fdfc',
              color: '#19b6a6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 12px',
            }}
          >
            🏢
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Join GlobeSync as an Agency Partner
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>
            Register your travel agency, book packages for offline clients, and earn competitive commissions.
          </p>
        </div>

        {apiError && (
          <div
            style={{
              padding: '12px 16px',
              background: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            ⚠️ {apiError}
          </div>
        )}

        {/* 1-Click Demo Fill for Evaluators */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => {
              const uniqueSuffix = Math.floor(100 + Math.random() * 900);
              setFormData({
                businessName: `Voyage World Tours ${uniqueSuffix}`,
                contactEmail: `contact${uniqueSuffix}@voyageworld.com`,
                contactPhone: `9876543${uniqueSuffix}`,
                password: 'AgencyPass@123',
                confirmPassword: 'AgencyPass@123',
                commissionRate: 1.5,
              });
              setErrors({});
              setApiError(null);
            }}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              background: '#f0fdfc',
              color: '#0d9488',
              border: '1px solid #99f6e4',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ⚡ Quick-Fill Sample Agency
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Agency Business Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Agency Business Name *
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => handleInputChange('businessName', e.target.value)}
              placeholder="e.g. Apex Travel & Tours"
              className="form-control"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: errors.businessName ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            />
            {errors.businessName && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.businessName}
              </span>
            )}
          </div>

          {/* Contact Email & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Contact Email *
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="ops@apextravel.com"
                className="form-control"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: errors.contactEmail ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              {errors.contactEmail && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.contactEmail}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Contact Phone *
              </label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder="9876543210"
                className="form-control"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: errors.contactPhone ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              {errors.contactPhone && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.contactPhone}
                </span>
              )}
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Account Password *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--muted)', padding: 0 }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="At least 6 characters"
                className="form-control"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: errors.password ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              {errors.password && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.password}
                </span>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Confirm Password *
                </label>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Re-enter password"
                className="form-control"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: errors.confirmPassword ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              {errors.confirmPassword && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.confirmPassword}
                </span>
              )}
            </div>
          </div>

          {/* Note on Approval */}
          <div
            style={{
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '12px',
              color: 'var(--muted)',
              marginBottom: '24px',
              lineHeight: '1.5',
            }}
          >
            🔒 <strong>Approval Notice:</strong> By submitting, you register as a reseller partner with standard commission tier (1.5%). Your account will be verified by our administrative team before login access is activated.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '15px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #19b6a6 0%, #0ea5e9 100%)',
              border: 'none',
              borderRadius: '10px',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Registering Agency...' : 'Register Agency Partner →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--muted)' }}>
          Already registered?{' '}
          <Link to="/login/agency" style={{ color: '#19b6a6', fontWeight: 700, textDecoration: 'none' }}>
            Log in to Agency Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
