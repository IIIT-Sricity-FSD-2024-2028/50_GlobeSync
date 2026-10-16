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
  const { login, isAuthenticated, role: activeRole, user: activeUser } = useSession();

  // If already logged in, offer immediate dashboard jump
  const redirectTarget = location.state?.from?.pathname;

  // Determine starting role from prop or query param (?role=admin)
  const roleFromQuery = searchParams.get('role');
  const startingRole = roleFromQuery || initialRole || 'traveler';

  // Controlled form state initialized with the role's demo credentials
  const [selectedRole, setSelectedRole] = useState(startingRole);
  const [email, setEmail] = useState(() => DEMO_CREDENTIALS[startingRole]?.email || '');
  const [password, setPassword] = useState(() => DEMO_CREDENTIALS[startingRole]?.password || '');
  const [accessCode, setAccessCode] = useState(() => DEMO_CREDENTIALS[startingRole]?.code || '');
  const [showPassword, setShowPassword] = useState(false);

  // UI status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Switch active role and immediately populate corresponding valid credentials
  const selectRoleAndFillCredentials = (roleKey) => {
    setSelectedRole(roleKey);
    const creds = DEMO_CREDENTIALS[roleKey];
    if (creds) {
      setEmail(creds.email);
      setPassword(creds.password);
      setAccessCode(creds.code);
    } else {
      setEmail('');
      setPassword('');
      setAccessCode('');
    }
    setErrorMessage('');
  };

  // Update form credentials if query param changes
  useEffect(() => {
    if (roleFromQuery && ['traveler', 'guide', 'support', 'admin', 'superuser', 'agency'].includes(roleFromQuery)) {
      selectRoleAndFillCredentials(roleFromQuery);
    }
  }, [roleFromQuery]);

  // Fill quick demo credentials
  const handleQuickFill = (roleKey) => {
    selectRoleAndFillCredentials(roleKey);
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

    // 2. Client-side access code validation for staff roles (if user explicitly typed a code)
    const requiredCode = ACCESS_CODES[selectedRole];
    if (requiredCode && accessCode.trim() && accessCode.trim() !== requiredCode) {
      setErrorMessage(
        `Invalid access code for ${selectedRole}. (Required code: ${requiredCode})`
      );
      return;
    }

    // 3. Backend API authentication with smart role fallback
    setIsSubmitting(true);
    try {
      let authResponse = null;

      // Primary attempt based on selected role
      try {
        if (selectedRole === 'traveler') {
          authResponse = await authApi.loginTraveler({
            email: trimmedEmail,
            password,
          });
        } else if (selectedRole === 'agency') {
          authResponse = await authApi.loginAgency({
            email: trimmedEmail,
            password,
          });
        } else {
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
      } catch (primaryErr) {
        // Smart Cross-Role Fallback: if credentials match another valid role, auto-switch and sign in
        let fallbackFound = false;

        // Try staff
        if (!authResponse && !['admin', 'superuser', 'guide', 'support'].includes(selectedRole)) {
          try {
            const staffResp = await authApi.loginStaff({ email: trimmedEmail, password });
            if (staffResp && staffResp.role) {
              authResponse = staffResp;
              setSelectedRole(staffResp.role);
              fallbackFound = true;
            }
          } catch {}
        }

        // Try agency
        if (!authResponse && selectedRole !== 'agency') {
          try {
            const agencyResp = await authApi.loginAgency({ email: trimmedEmail, password });
            if (agencyResp && agencyResp.role) {
              authResponse = agencyResp;
              setSelectedRole('agency');
              fallbackFound = true;
            }
          } catch {}
        }

        // Try traveler
        if (!authResponse && selectedRole !== 'traveler') {
          try {
            const travelerResp = await authApi.loginTraveler({ email: trimmedEmail, password });
            if (travelerResp && travelerResp.role) {
              authResponse = travelerResp;
              setSelectedRole('traveler');
              fallbackFound = true;
            }
          } catch {}
        }

        if (!fallbackFound) {
          throw primaryErr;
        }
      }

      // 4. Save session into SessionContext and localStorage
      login(authResponse.role, authResponse.user);
      setSuccessMessage(`Welcome back, ${authResponse.user.name || authResponse.user.businessName || 'User'}!`);

      // 5. Navigate to destination or role dashboard safely
      const dashboardPath = getDashboardPath(authResponse.role);
      let nextPath = dashboardPath;

      if (redirectTarget && redirectTarget !== '/unauthorized' && redirectTarget !== '/login') {
        // Only honor redirectTarget if the authenticated role is authorized for that path
        const rolePrefix = `/${authResponse.role}`;
        if (redirectTarget.startsWith(rolePrefix) || authResponse.role === 'superuser') {
          nextPath = redirectTarget;
        }
      }

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

        {/* Currently signed-in session banner */}
        {isAuthenticated && activeUser && (
          <div
            style={{
              padding: '10px 14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              fontSize: '12px',
              color: '#1e40af',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              ℹ️ Signed in as <strong>{activeUser.name || activeUser.businessName || activeUser.email}</strong> ({activeRole})
            </span>
            <Link
              to={getDashboardPath(activeRole)}
              style={{ fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
            >
              Go to Workspace →
            </Link>
          </div>
        )}

        {/* Role Selector Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '20px' }}>
          {[
            { key: 'traveler', label: 'Traveler' },
            { key: 'guide', label: 'Guide' },
            { key: 'support', label: 'Support' },
            { key: 'agency', label: 'Agency' },
            { key: 'admin', label: 'Admin' },
            { key: 'superuser', label: 'Super-Admin' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => selectRoleAndFillCredentials(item.key)}
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

        {/* Active Role & Auto-filled Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#166534',
          }}
        >
          <span>
            🔑 Ready-to-test credentials loaded for <strong>{selectedRole === 'superuser' ? 'Super-Admin' : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}</strong>
          </span>
          <span style={{ fontSize: '11px', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
            Pre-filled ✓
          </span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--muted)', padding: 0 }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈 Hide' : '👁️ Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Staff Access Code</label>
                <button
                  type="button"
                  onClick={() => setAccessCode(ACCESS_CODES[selectedRole])}
                  style={{
                    fontSize: '11px',
                    color: 'var(--primary)',
                    background: '#fdf2f8',
                    border: '1px solid #fbcfe8',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                  }}
                >
                  Insert Code ({ACCESS_CODES[selectedRole]})
                </button>
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
            {isSubmitting ? 'Signing In...' : `Sign In as ${selectedRole === 'superuser' ? 'Super-Admin' : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} →`}
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
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: selectedRole === key ? 700 : 500,
                  background: selectedRole === key ? '#ffeef5' : '#f9fafb',
                  color: selectedRole === key ? 'var(--primary)' : 'var(--text-secondary)',
                  border: selectedRole === key ? '1px solid var(--primary)' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {key === 'superuser' ? 'super-admin' : key}
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
