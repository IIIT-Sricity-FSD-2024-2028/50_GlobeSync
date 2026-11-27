import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';

/**
 * Reusable Swagger decorator that adds the x-user-role header
 * to the Swagger docs for any endpoint.
 *
 * Usage: @ApiRoleHeader()
 */
export function ApiRoleHeader() {
  return applyDecorators(
    ApiHeader({
      name: 'x-user-role',
      description: `User role for RBAC. Allowed values: ${Object.values(Role).join(', ')}`,
      required: false,
      enum: Object.values(Role),
      example: Role.TRAVELER,
    }),
  );
}
