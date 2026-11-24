import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard as OwnershipRolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { findLegacyAccount } from '../identity.util';

/**
 * Global authentication + authorisation guard (registered as APP_GUARD).
 *
 * Before this guard existed, most controllers (trips, bookings, travelers, guides,
 * payments, refunds, reviews, messages, ...) had no guard at all, so `@Roles(...)`
 * was decoration only, and the controllers that did use the legacy RolesGuard
 * trusted the client-supplied `x-user-role` / `x-user-id` headers.
 *
 * For every route that declares `@Roles(...)` this guard now:
 *   1. requires a valid, unexpired access token (Bearer header or httpOnly cookie),
 *   2. rejects tokens of accounts that were deactivated after the token was issued,
 *   3. populates request.user from the verified token, and
 *   4. runs the existing role + object-ownership rules (common/guards/roles.guard.ts)
 *      against that verified identity.
 * Routes without `@Roles(...)` stay public (health, login, registration, catalogue).
 */
@Injectable()
export class GlobalAuthGuard implements CanActivate {
  private readonly ownership: OwnershipRolesGuard;

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    this.ownership = new OwnershipRolesGuard(reflector);
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const token = this.extractToken(request);
    if (!requiredRoles || requiredRoles.length === 0) {
      // Public route: attach the identity when a valid token is present, never require it.
      if (token) {
        try {
          request.user = this.toUser(this.verify(token));
        } catch {
          /* ignore invalid token on public routes */
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required. Please sign in.');
    }

    let payload: JwtPayload;
    try {
      payload = this.verify(token);
    } catch {
      throw new UnauthorizedException('Session expired or invalid. Please sign in again.');
    }

    const legacy = payload.email ? findLegacyAccount(payload.email) : null;
    if (legacy?.blockedReason) {
      throw new UnauthorizedException(legacy.blockedReason);
    }

    request.user = this.toUser(payload);
    return this.ownership.canActivate(context);
  }

  private verify(token: string): JwtPayload {
    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'gs-access-secret-change-in-prod',
    });
    if (!payload?.sub || !payload?.role) throw new UnauthorizedException('Invalid token payload.');
    return payload;
  }

  private toUser(payload: JwtPayload) {
    return {
      userId: String(payload.pid ?? payload.sub),
      accountId: payload.sub,
      email: payload.email,
      role: String(payload.role).toLowerCase(),
    };
  }

  private extractToken(request: any): string | null {
    const header = request.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7).trim() || null;
    }
    return request.cookies?.['access_token'] ?? null;
  }
}
