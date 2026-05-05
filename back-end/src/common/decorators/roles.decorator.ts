import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict route access to specific roles.
 * Usage: @Roles(Role.ADMIN, Role.SUPERUSER)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
