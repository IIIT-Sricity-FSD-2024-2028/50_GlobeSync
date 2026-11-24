import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guards a route with JWT access-token verification.
 * Throws 401 Unauthorized if the token is missing, expired, or invalid.
 * On success, populates request.user with { userId, email, role }.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
