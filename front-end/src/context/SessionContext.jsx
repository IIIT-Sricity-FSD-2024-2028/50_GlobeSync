import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAccessToken, clearAccessToken, getAccessToken, authApi } from '../services/api';

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

export function SessionProvider({ children }) {
  const [{ user, role }, setSession] = useState(() => restoreSession());

  /**
   * Save authenticated session with JWT access token
   */
  const login = (newRole, newUser, token) => {
    const normalizedRole = (newRole || '').toLowerCase();
    if (!VALID_ROLES.includes(normalizedRole)) {
      throw new Error(`Cannot login with unrecognized role: ${newRole}`);
    }

    if (token) {
      setAccessToken(token);
    }

    setSession({ user: newUser, role: normalizedRole });
    localStorage.setItem('role', normalizedRole);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

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
    }
  }, []);

  /**
   * Update active user details in session and localStorage
   */
  const updateUser = (updatedUserFields) => {
    setSession((prev) => {
      const mergedUser = { ...prev.user, ...updatedUserFields };
      localStorage.setItem('user', JSON.stringify(mergedUser));
      return { ...prev, user: mergedUser };
    });
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
