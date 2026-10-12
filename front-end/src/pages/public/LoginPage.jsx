import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useSession, getDashboardPath } from '../../context/SessionContext';
import { authApi, ApiError } from '../../services/api';

// Client-side access codes for staff roles (preserved from legacy frontend)
const ACCESS_CODES = {
  admin: 'ADMIN-TICP',
  superuser: 'SUPER-2026',
  guide: 'GUIDE-2026',
  support: 'SUPP-2026',
};

// Seed credentials from in-memory backend for instant testing
const DEMO_CREDENTIALS = {
  traveler: { email: 'Arjun@gmail.com', password: 'traveler123', code: '' },
  guide: { email: 'Devansh@gmail.com', password: 'guide123', code: 'GUIDE-2026' },
  support: { email: 'Aisha.johnson@gmail.com', password: 'support123', code: 'SUPP-2026' },
  admin: { email: 'admin@ticp.com', password: 'admin123', code: 'ADMIN-TICP' },
  superuser: { email: 'superadmin@ticp.com', password: 'super123', code: 'SUPER-2026' },
  agency: { email: 'ops@horizontravel.com', password: 'horizon123', code: '' },
};

export default function LoginPage({ initialRole = 'traveler' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, role: activeRole } = useSession();

  // If already logged in, offer immediate dashboard jump
  const redirectTarget = location.state?.from?.pathname;

  // Determine starting role from prop or query param (?role=admin)
  const roleFromQuery = searchParams.get('role');
  const startingRole = roleFromQuery || initialRole || 'traveler';

  // Controlled form state
  const [selectedRole, setSelectedRole] = useState(startingRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');

  // UI status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Update form defaults if query param changes
  useEffect(() => {
    if (roleFromQuery && ['traveler', 'guide', 'support', 'admin', 'superuser', 'agency'].includes(roleFromQuery)) {
      setSelectedRole(roleFromQuery);
    }
  }, [roleFromQuery]);

  // Fill quick demo credentials
  const handleQuickFill = (roleKey) => {
    const creds = DEMO_CREDENTIALS[roleKey];
    if (creds) {
      setSelectedRole(roleKey);
      setEmail(creds.email);
      setPassword(creds.password);
      setAccessCode(creds.code);
      setErrorMessage('');
    }
  };

  // Form submit event handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Client-side validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    // 2. Client-side access code validation for staff roles
    const requiredCode = ACCESS_CODES[selectedRole];
    if (requiredCode) {
      if (accessCode.trim() !== requiredCode) {
        setErrorMessage(
          `Invalid access code for ${selectedRole}. (Required code: ${requiredCode})`
        );
        return;
      }
    }

    // 3. Backend API authentication
    setIsSubmitting(true);
    try {
      let authResponse;

      if (selectedRole === 'traveler') {
        // Traveler login endpoint
        authResponse = await authApi.loginTraveler({
          email: trimmedEmail,
          password,
        });
      } else if (selectedRole === 'agency') {
        // Agency login endpoint
        authResponse = await authApi.loginAgency({
          email: trimmedEmail,
          password,
        });
      } else {
        // Staff login endpoint (admin, superuser, guide, support)
        authResponse = await authApi.loginStaff({
          email: trimmedEmail,
          password,
        });

        // Verify the authenticated role matches the selected role
        if (authResponse.role !== selectedRole && !(selectedRole === 'admin' && authResponse.role === 'superuser')) {
          throw new ApiError(
            `Credentials belong to a ${authResponse.role} account, not ${selectedRole}.`,
            401
          );
        }
      }

      // 4. Save session into SessionContext and localStorage
      login(authResponse.role, authResponse.user);
      setSuccessMessage(`Welcome back, ${authResponse.user.name || authResponse.user.businessName || 'User'}!`);

      // 5. Navigate to destination or role dashboard
      const nextPath = redirectTarget || getDashboardPath(authResponse.role);
      setTimeout(() => {
        navigate(nextPath, { replace: true });
      }, 500);

    } catch (err) {
      console.error('Login failed:', err);
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '40px auto', padding: '0 20px' }}>
      <div className="card" style={{ padding: '32px', borderRadius: '16px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🌐</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>GlobeSync Portal Login</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
            Sign in to access your role workspace
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '24px' }}>
          {[
            { key: 'traveler', label: 'Traveler' },
            { key: 'guide', label: 'Guide' },
            { key: 'support', label: 'Support' },
            { key: 'agency', label: 'Agency' },
            { key: 'admin', label: 'Admin' },
            { key: 'superuser', label: 'Superuser' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setSelectedRole(item.key);
                setErrorMessage('');
              }}
              style={{
                padding: '8px 4px',
                fontSize: '12px',
                fontWeight: selectedRole === item.key ? 700 : 500,
                background: selectedRole === item.key ? 'var(--gradient)' : '#f3f4f6',
                color: selectedRole === item.key ? '#fff' : 'var(--text)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Error / Success Feedback Alerts */}
        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fee2e2',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '12px 14px',
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            ✅ {successMessage}
          </div>
        )}

        {/* Controlled Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@example.com"
              disabled={isSubmitting}
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isSubmitting}
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Access Code Input for Staff Roles */}
          {ACCESS_CODES[selectedRole] && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Staff Access Code</label>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  Hint: {ACCESS_CODES[selectedRole]}
                </span>
              </div>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder={ACCESS_CODES[selectedRole]}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{
              padding: '12px',
              fontSize: '15px',
              fontWeight: 700,
              width: '100%',
              marginTop: '8px',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Signing In...' : `Sign In as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} →`}
          </button>
        </form>

        {/* Quick Demo Fill Buttons for Viva / Reviewers */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
            ⚡ Instant Demo Accounts (1-Click Fill)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.keys(DEMO_CREDENTIALS).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleQuickFill(key)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--muted)' }}>
          Don't have an account?{' '}
          <Link to="/signup/traveler" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Sign up as Traveler
          </Link>
          {' • '}
          <Link to="/signup/agency" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Register Agency
          </Link>
        </div>
      </div>
    </div>
  );
}
