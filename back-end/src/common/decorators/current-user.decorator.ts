import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

/**
 * @CurrentUser() — extracts the authenticated user from request.user
 * (populated by JwtAuthGuard from the verified JWT payload).
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   getMe(@CurrentUser() user: AuthenticatedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * @AuthUserId() — role-specific profile id of the verified caller, as a string.
 * Replaces the former @Headers('x-user-id'), which any client could forge.
 */
export const AuthUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const user = ctx.switchToHttp().getRequest().user;
    return user?.userId !== undefined ? String(user.userId) : undefined;
  },
);

/**
 * @AuthRole() — role of the verified caller (lower-case).
 * Replaces the former @Headers('x-user-role'), which any client could forge.
 */
export const AuthRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    return ctx.switchToHttp().getRequest().user?.role;
  },
);
