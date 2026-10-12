import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';

/**
 * Route protection component for authenticated zones
 * - Redirects to /login if unauthenticated
 * - Redirects to /unauthorized if user's role is not in allowedRoles
 * - Note: This client check provides clean UI redirection;
 *   authoritative security is enforced by NestJS RolesGuard on each API call.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role } = useSession();
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve attempted URL to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Role mismatch: redirect to informative Unauthorized page
    return <Navigate to="/unauthorized" state={{ attempted: location.pathname }} replace />;
  }

  return children;
}
