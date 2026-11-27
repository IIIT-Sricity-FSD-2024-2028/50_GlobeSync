import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { authActions } from '../store/auth/auth-slice';
import {
  setAccessToken,
  clearAccessToken,
  getAccessToken,
  getRefreshToken,
  setRefreshToken,
  authApi,
} from '../services/api';

// ==========================================================
// GlobeSync — SessionContext (JWT Authenticated)
// ==========================================================
// Manages authenticated user state, verified role, and token
// lifecycle across all dashboard portals.
// ==========================================================

export const SessionContext = createContext(null);

const VALID_ROLES = ['traveler', 'guide', 'support', 'admin', 'superuser', 'agency'];

/**
 * Returns role-specific dashboard path
 */
export function getDashboardPath(role) {
  switch (role) {
    case 'traveler':
      return '/traveler/dashboard';
    case 'guide':
      return '/guide/dashboard';
    case 'support':
      return '/support/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'superuser':
      return '/super/dashboard';
    case 'agency':
      return '/agency/dashboard';
    default:
      return '/';
  }
}

/**
 * Safely parse and validate stored session from browser localStorage
 */
function restoreSession() {
  try {
    const storedRole = localStorage.getItem('role');
    const storedUserRaw = localStorage.getItem('user');
    const storedToken = getAccessToken();

    if (!storedRole || !storedUserRaw) {
      return { user: null, role: null };
    }

    if (!VALID_ROLES.includes(storedRole)) {
      clearAccessToken();
      return { user: null, role: null };
    }

    const parsedUser = JSON.parse(storedUserRaw);
    if (!parsedUser || typeof parsedUser !== 'object') {
      clearAccessToken();
      return { user: null, role: null };
    }

    return { user: parsedUser, role: storedRole };
  } catch (err) {
    console.error('[Session] Error parsing stored session:', err);
    clearAccessToken();
    return { user: null, role: null };
  }
}

function extractTravelerId(user, role) {
  if (!user) return null;
  if (user.travelerId) return user.travelerId;
  if (role === 'traveler') return user.id ?? user._id ?? null;
  return null;
}

export function SessionProvider({ children }) {
  const dispatch = useDispatch();
  const [{ user, role }, setSession] = useState(() => restoreSession());

  // Sync restored session from localStorage into Redux auth slice on mount
  useEffect(() => {
    if (user && role) {
      dispatch(
        authActions.setAuthSession({
          user,
          role,
          travelerId: extractTravelerId(user, role),
        })
      );
    } else {
      dispatch(authActions.clearAuthSession());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  /**
   * Save authenticated session with JWT access token and optional refresh token
   */
  const login = (newRole, newUser, token, refreshToken) => {
    const normalizedRole = (newRole || '').toLowerCase();
    if (!VALID_ROLES.includes(normalizedRole)) {
      throw new Error(`Cannot login with unrecognized role: ${newRole}`);
    }

    if (token) {
      setAccessToken(token);
    }
    if (refreshToken) {
      setRefreshToken(refreshToken);
    }

    setSession({ user: newUser, role: normalizedRole });
    localStorage.setItem('role', normalizedRole);
    localStorage.setItem('user', JSON.stringify(newUser));
    dispatch(
      authActions.setAuthSession({
        user: newUser,
        role: normalizedRole,
        travelerId: extractTravelerId(newUser, normalizedRole),
      })
    );
  };

  /**
   * Proactive token refresh on mount: decode JWT exp using native JSON.parse(atob(...))
   * and refresh if expired or within 2 minutes of expiry.
   */
  useEffect(() => {
    const token = getAccessToken();
    if (!token || !user) return;

    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(payloadBase64));

        if (payload && payload.exp) {
          const expiryMs = payload.exp * 1000;
          const timeUntilExpiry = expiryMs - Date.now();
          const twoMinutesMs = 2 * 60 * 1000;

          if (timeUntilExpiry <= twoMinutesMs) {
            const currentRefreshToken = getRefreshToken();
            authApi
              .refresh(currentRefreshToken)
              .then((res) => {
                if (res?.accessToken) {
                  setAccessToken(res.accessToken);
                  if (res.refreshToken) {
                    setRefreshToken(res.refreshToken);
                  }
                }
              })
              .catch((err) => {
                if (err.status === 401 || err.status === 403) {
                  window.dispatchEvent(new CustomEvent('auth:session-expired'));
                }
              });
          }
        }
      }
    } catch (err) {
      console.warn('[Session] Failed to parse JWT for proactive refresh:', err);
    }
  }, []);

  /**
   * Listen for native auth:session-expired event to cleanly log out and redirect once
   */
  useEffect(() => {
    let redirected = false;
    const handleSessionExpired = () => {
      if (redirected) return;
      redirected = true;
      clearAccessToken();
      setSession({ user: null, role: null });
      dispatch(authActions.clearAuthSession());
      const currentPath = window.location.pathname;
      if (
        !currentPath.startsWith('/login') &&
        !currentPath.startsWith('/signup') &&
        !currentPath.startsWith('/register')
      ) {
        window.location.href = '/login?expired=1';
      }
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  /**
   * Clear session and revoke tokens
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Best-effort logout: continue clearing client state even if backend unreachable
    } finally {
      clearAccessToken();
      setSession({ user: null, role: null });
      dispatch(authActions.clearAuthSession());
    }
  }, [dispatch]);

  /**
   * Update active user details in session and localStorage
   */
  const updateUser = (updatedUserFields) => {
    const mergedUser = { ...user, ...updatedUserFields };
    setSession((prev) => {
      const nextUser = { ...prev.user, ...updatedUserFields };
      localStorage.setItem('user', JSON.stringify(nextUser));
      return { ...prev, user: nextUser };
    });
    if (role) {
      dispatch(
        authActions.setAuthSession({
          user: mergedUser,
          role,
          travelerId: extractTravelerId(mergedUser, role),
        })
      );
    }
  };

  const isAuthenticated = Boolean(role && user);

  const value = {
    user,
    role,
    isAuthenticated,
    login,
    logout,
    updateUser,
    getDashboardPath: () => getDashboardPath(role),
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export const useAuth = useSession;
export default SessionContext;
