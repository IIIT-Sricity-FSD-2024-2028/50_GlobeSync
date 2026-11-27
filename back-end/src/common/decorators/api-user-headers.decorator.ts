import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';

/**
 * Reusable Swagger decorator that adds both x-user-role and x-user-id headers.
 * Use on endpoints that need user identity for ownership checks.
 *
 * Usage: @ApiUserHeaders()
 */
export function ApiUserHeaders() {
  return applyDecorators(
    ApiHeader({
      name: 'x-user-role',
      description: `User role for RBAC. Allowed values: ${Object.values(Role).join(', ')}`,
      required: false,
      enum: Object.values(Role),
      example: Role.TRAVELER,
    }),
    ApiHeader({
      name: 'x-user-id',
      description: 'User ID for ownership verification',
      required: false,
      example: '1',
    }),
  );
}
