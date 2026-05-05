import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that checks the x-user-role header against
 * the roles specified by the @Roles() decorator.
 *
 * RBAC rules:
 * - If the route has no role metadata → allow access.
 * - If the route has role metadata → check x-user-role header.
 * - If role header is missing or not in the allowed list → 403 Forbidden.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from the @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, the route is public
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Read role from request header
    const request = context.switchToHttp().getRequest();
    const userRole = request.headers['x-user-role'] as string;

    if (!userRole) {
      throw new ForbiddenException(
        'Access denied. Missing x-user-role header.',
      );
    }

    const hasRole = requiredRoles.some((role) => role === userRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Role '${userRole}' is not authorized for this resource. Required: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
