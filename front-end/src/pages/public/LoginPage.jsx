import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useSession, getDashboardPath } from '../../context/SessionContext';
import { authApi, ApiError, setRefreshToken } from '../../services/api';
import { DEMO_ACTORS, isDemoAccountsEnabled } from '../../config/demoActors';

export default function LoginPage({ initialRole = 'traveler' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, role: activeRole, user: activeUser } = useSession();

  const redirectTarget = location.state?.from?.pathname;
  const roleFromQuery = searchParams.get('role');
  const showDemoPicker = isDemoAccountsEnabled();

  // Find initial actor
  const initialActor = DEMO_ACTORS.find(
    (a) => a.role === (roleFromQuery || initialRole)
  ) || DEMO_ACTORS[0];

  // Selected actor in the picker
  const [selectedActor, setSelectedActor] = useState(initialActor);

  // Form input fields
  const [email, setEmail] = useState(() => (showDemoPicker && initialActor ? initialActor.email : ''));
  const [password, setPassword] = useState(() => (showDemoPicker && initialActor ? initialActor.password : ''));
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // UI feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // When actor is selected from the picker, show details and auto-fill form
  const handleActorSelect = (actor) => {
    setSelectedActor(actor);
    setEmail(actor.email);
    setPassword(actor.password);
    setErrorMessage('');
  };

  // Sync with query param if it changes
  useEffect(() => {
    if (roleFromQuery) {
      const match = DEMO_ACTORS.find((a) => a.role === roleFromQuery);
      if (match) {
        handleActorSelect(match);
      }
    }
  }, [roleFromQuery]);

  // Notice session expiration query flag
  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setErrorMessage('Your session has expired. Please sign in again.');
    }
  }, [searchParams]);

  // Copy helper with brief UI feedback
  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Real cryptographic JWT login (POST /auth/login)
      const authResponse = await authApi.login({
        email: trimmedEmail,
        password,
      });

      const userRole = (authResponse.user?.role || authResponse.role || 'traveler').toLowerCase();
      const userData = authResponse.user || { email: trimmedEmail, role: userRole };
      const token = authResponse.accessToken;
      const refreshToken = authResponse.refreshToken;

      // Save into session context and storage
      login(userRole, userData, token, refreshToken);
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }

      setSuccessMessage(
        `Welcome, ${userData.name || userData.email}! Redirecting to ${userRole.toUpperCase()} workspace...`
      );

      // Determine redirect destination
      const dashboardPath = getDashboardPath(userRole);
      let nextPath = dashboardPath;

      if (redirectTarget && redirectTarget !== '/unauthorized' && redirectTarget !== '/login') {
        const rolePrefix = `/${userRole}`;
        if (redirectTarget.startsWith(rolePrefix) || userRole === 'superuser') {
          nextPath = redirectTarget;
        }
      }

      setTimeout(() => {
        navigate(nextPath, { replace: true });
      }, 500);

    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '580px', margin: '40px auto', padding: '0 20px' }}>
      <div className="card" style={{ padding: '32px', borderRadius: '16px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🌐</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>GlobeSync Portal Login</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
            Sign in to access your role workspace with JWT authentication
          </p>
        </div>

        {/* Active Session Notification */}
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
              ℹ️ Currently signed in as <strong>{activeUser.name || activeUser.email}</strong> ({activeRole})
            </span>
            <Link
              to={getDashboardPath(activeRole)}
              style={{ fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
            >
              Go to Workspace →
            </Link>
          </div>
        )}

        {/* ======================================================== */}
        {/* LOGIN PAGE ACTOR PICKER (Rendered ONLY if demo enabled) */}
        {/* ======================================================== */}
        {showDemoPicker && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569' }}>
                🎭 Choose Actor (Academic Demo Mode)
              </span>
              <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                1-Click Preset
              </span>
            </div>

            {/* Actor Selection Grid / Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {DEMO_ACTORS.map((actor) => {
                const isSelected = selectedActor.key === actor.key;
                return (
                  <button
                    key={actor.key}
                    type="button"
                    aria-label={actor.name}
                    data-testid={`actor-btn-${actor.key}`}
                    onClick={() => handleActorSelect(actor)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px 8px',
                      borderRadius: '8px',
                      border: isSelected ? `2px solid ${actor.badgeColor}` : '1px solid #cbd5e1',
                      background: isSelected ? '#ffffff' : '#f1f5f9',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <span style={{ fontSize: '20px', marginBottom: '4px' }}>{actor.avatarIcon}</span>
                    <span style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 700, color: isSelected ? actor.badgeColor : '#1e293b' }}>
                      {actor.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Actor Details Card */}
            {selectedActor && (
              <div
                style={{
                  padding: '12px 14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{selectedActor.avatarIcon}</span>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{selectedActor.name} Workspace</strong>
                    <span
                      style={{
                        fontSize: '10px',
                        background: `${selectedActor.badgeColor}15`,
                        color: selectedActor.badgeColor,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedActor.role}
                    </span>
                  </div>
                </div>

                {/* One-line Portal Description */}
                <p style={{ margin: '4px 0 10px 0', color: '#475569', fontSize: '11px', lineHeight: '1.4' }}>
                  ℹ️ <strong>Portal:</strong> {selectedActor.portalDescription}
                </p>

                {/* Quick Copy Credentials Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📧 {selectedActor.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedActor.email, 'email')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--primary)', padding: '0 4px' }}
                      title="Copy Email"
                    >
                      {copiedField === 'email' ? '✓' : '📋'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                      🔑 {showPassword ? selectedActor.password : '••••••••'}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#64748b' }}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedActor.password, 'password')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--primary)' }}
                        title="Copy Password"
                      >
                        {copiedField === 'password' ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error / Success Feedback */}
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

        {/* Controlled Form — Real Login */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="loginpage-field-1" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Email Address
            </label>
            <input id="loginpage-field-1"
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
              <label htmlFor="loginpage-field-2" style={{ fontSize: '13px', fontWeight: 600 }}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--muted)', padding: 0 }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈 Hide' : '👁️ Show'}
              </button>
            </div>
            <input id="loginpage-field-2"
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
            {isSubmitting ? 'Verifying Credentials...' : 'Sign In with JWT →'}
          </button>
        </form>

        {/* Registration Links */}
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
