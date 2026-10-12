import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession, getDashboardPath } from '../../context/SessionContext';

export default function UnauthorizedPage() {
  const { role, isAuthenticated, logout } = useSession();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '80px 20px', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: '56px', marginBottom: '16px' }}>🛡️</div>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#ef4444', marginBottom: '12px' }}>
        403 Forbidden — Access Denied
      </h1>

      <p style={{ fontSize: '16px', color: 'var(--muted)', lineHeight: '1.7', marginBottom: '24px' }}>
        {isAuthenticated ? (
          <>
            You are currently signed in with the role <strong style={{ color: 'var(--text)' }}>"{role}"</strong>.
            This area requires different permissions.
          </>
        ) : (
          <>You must sign in with an authorized account to access this page.</>
        )}
      </p>

      <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '16px', marginBottom: '32px', fontSize: '13px', color: '#991b1b', textAlign: 'left', lineHeight: '1.6' }}>
        <strong>Backend Security Notice:</strong>
        <br />
        Client-side route guards prevent invalid user navigation. The NestJS backend enforces authoritative access via <code>RolesGuard</code> on every REST endpoint. Direct HTTP requests without the required <code>x-user-role</code> header will be rejected with HTTP 403.
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {isAuthenticated ? (
          <>
            <Link
              to={getDashboardPath(role)}
              className="btn btn-primary"
              style={{ padding: '12px 24px', textDecoration: 'none' }}
            >
              Go to My Dashboard ({role})
            </Link>
            <button
              onClick={handleLogout}
              className="btn"
              style={{ padding: '12px 24px', border: '1.5px solid var(--border)', background: '#fff' }}
            >
              Sign In with Another Account
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="btn btn-primary"
            style={{ padding: '12px 24px', textDecoration: 'none' }}
          >
            Go to Login Portal
          </Link>
        )}
      </div>
    </div>
  );
}
