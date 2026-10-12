import React, { createContext, useContext, useState, useEffect } from 'react';

// ==========================================================
// GlobeSync — SessionContext
// ==========================================================
// Manages shared user authentication and active role state.
// Handles session persistence and robust malformed-data recovery.
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

    if (!storedRole || !storedUserRaw) {
      return { user: null, role: null };
    }

    // Role validity check
    if (!VALID_ROLES.includes(storedRole)) {
      console.warn(`[Session] Corrupted role "${storedRole}" encountered. Purging.`);
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      return { user: null, role: null };
    }

    // Malformed JSON parsing check
    const parsedUser = JSON.parse(storedUserRaw);

    // Verify parsed data is a valid user object with an ID
    if (!parsedUser || typeof parsedUser !== 'object') {
      console.warn('[Session] User data was not a valid object. Purging.');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      return { user: null, role: null };
    }

    const hasIdentifier =
      parsedUser.travelerId || parsedUser.traveler_id ||
      parsedUser.adminId    || parsedUser.admin_id ||
      parsedUser.guideId    || parsedUser.guide_id ||
      parsedUser.careId     || parsedUser.care_id ||
      parsedUser.agencyId   || parsedUser.agency_id ||
      parsedUser.id;

    if (!hasIdentifier) {
      console.warn('[Session] User object lacks valid identifier. Purging.');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      return { user: null, role: null };
    }

    return { user: parsedUser, role: storedRole };
  } catch (err) {
    console.error('[Session] JSON parse failed on stored session. Purging malformed data:', err);
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    return { user: null, role: null };
  }
}

export function SessionProvider({ children }) {
  // Initialize state directly with safe restoration
  const [{ user, role }, setSession] = useState(() => restoreSession());

  // Store session in state and localStorage
  const login = (newRole, newUser) => {
    if (!VALID_ROLES.includes(newRole)) {
      throw new Error(`Cannot login with unrecognized role: ${newRole}`);
    }
    setSession({ user: newUser, role: newRole });
    localStorage.setItem('role', newRole);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // Clear session from state and localStorage
  const logout = () => {
    setSession({ user: null, role: null });
    localStorage.removeItem('role');
    localStorage.removeItem('user');
  };

  // Update user details in active session and localStorage after profile changes
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

/**
 * Custom hook to consume session state
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

// Backwards-compatible alias for useAuth
export const useAuth = useSession;
export default SessionContext;
