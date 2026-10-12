// Re-export SessionContext as AuthContext for clean backward compatibility
export {
  SessionContext as AuthContext,
  SessionProvider as AuthProvider,
  useSession as useAuth,
  useSession,
  getDashboardPath,
  default,
} from './SessionContext';
