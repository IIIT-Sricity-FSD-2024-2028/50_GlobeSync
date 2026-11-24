import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

/**
 * Guards a route by comparing the JWT-verified role (request.user.role)
 * against the roles specified by @Roles(...) decorator.
 *
 * MUST be used AFTER JwtAuthGuard so request.user is populated.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles decorator → route is accessible to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role: string } | undefined;

    if (!user?.role) {
      throw new ForbiddenException('Access denied. No role found in token.');
    }

    const hasRole = requiredRoles.some((r) => r === user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Role '${user.role}' is not authorized. Required: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
