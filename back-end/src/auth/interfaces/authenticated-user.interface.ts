// Attached to request.user after JwtAuthGuard verification
export interface AuthenticatedUser {
  /** Role-specific profile id used for ownership checks */
  userId: string;
  /** Login account id (auth store) */
  accountId?: string;
  email: string;
  role: string;
}
