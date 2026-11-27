import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

const OWN_RESOURCE_ERROR = 'Access denied. You can only access your own resources.';

/**
 * OwnershipGuard — enforces that the authenticated user (from JWT, via request.user)
 * can only access their own resources based on route params or body fields.
 *
 * Usage: apply AFTER JwtAuthGuard + RolesGuard.
 *
 * The guard reads request.user.userId (UUID string) and compares with:
 *   - route param :id, :userId, :travelerId, :guideId, :agencyId
 *   - body fields: travelerId, guideId, agencyId
 *
 * Admin & Superuser bypass all ownership checks.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string; role: string } | undefined;

    if (!user) return false;

    // Admins bypass ownership checks (they manage all resources)
    if (user.role === 'admin' || user.role === 'superuser') {
      return true;
    }

    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const userId = user.userId;

    return this.checkOwnership(controllerName, handlerName, userId, user.role, request);
  }

  private checkOwnership(
    controllerName: string,
    handlerName: string,
    userId: string,
    role: string,
    request: any,
  ): boolean {
    const params = request.params ?? {};
    const body = request.body ?? {};

    switch (controllerName) {
      case 'TravelersController':
        if (['findOne', 'update', 'remove'].includes(handlerName)) {
          this.ensureMatch(params.id, userId);
        }
        break;

      case 'GuidesController':
        if (['findOne', 'update'].includes(handlerName) && role === 'guide') {
          this.ensureMatch(params.id, userId);
        }
        break;

      case 'AgenciesController':
        if (['findOne', 'update'].includes(handlerName) && role === 'agency') {
          this.ensureMatch(params.id, userId);
        }
        break;

      case 'SupportUsersController':
        if (['findOne', 'update'].includes(handlerName) && role === 'support') {
          this.ensureMatch(params.id, userId);
        }
        break;

      case 'AdminsController':
        if (['findOne', 'update'].includes(handlerName)) {
          this.ensureMatch(params.id, userId);
        }
        break;
    }

    return true;
  }

  private ensureMatch(paramValue: string | undefined, userId: string): void {
    if (!paramValue || paramValue !== userId) {
      throw new ForbiddenException(OWN_RESOURCE_ERROR);
    }
  }
}
