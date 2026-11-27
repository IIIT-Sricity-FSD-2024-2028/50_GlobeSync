// JWT payload shape stored in the signed token
export interface JwtPayload {
  sub: string;      // login account id
  pid?: number;     // role-specific profile id (travelerId, guideId, adminId, careId, agencyId)
  email: string;
  role: string;     // Role enum value
  iat?: number;
  exp?: number;
}
