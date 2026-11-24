import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTravelerDto, RegisterAgencyDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── REGISTER ─────────────────────────────────────────────────────────────

  @Post('register/traveler')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new traveler account' })
  @ApiResponse({ status: 201, description: 'Traveler account created.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  registerTraveler(@Body() dto: RegisterTravelerDto) {
    return this.authService.registerTraveler(dto);
  }

  @Post('register/agency')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new agency account (pending admin approval)' })
  @ApiResponse({ status: 201, description: 'Agency registered.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  registerAgency(@Body() dto: RegisterAgencyDto) {
    return this.authService.registerAgency(dto);
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with any role — returns JWT access + refresh tokens' })
  @ApiResponse({ status: 200, description: 'Login successful.', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account locked.' })
  @ApiResponse({ status: 403, description: 'Account inactive or agency not approved.' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, res);
  }

  // ─── Legacy role-specific endpoints (kept for backward compat) ─────────────

  @Post('traveler-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '[Legacy] Traveler login — use POST /auth/login instead' })
  async travelerLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('staff-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '[Legacy] Staff login — use POST /auth/login instead' })
  async staffLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('agency-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '[Legacy] Agency login — use POST /auth/login instead' })
  async agencyLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  // ─── REFRESH ───────────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({ status: 200, description: 'Token rotated.' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired.' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Accept refresh token from body OR httpOnly cookie
    const token = dto?.refreshToken ?? req.cookies?.['refresh_token'];
    return this.authService.refresh(token, res);
  }

  // ─── LOGOUT ────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke refresh token and clear cookies' })
  async logout(
    @Body() body: Partial<RefreshTokenDto>,
    @Req() req: Request & { user: { userId: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = body?.refreshToken ?? req.cookies?.['refresh_token'];
    return this.authService.logout(token, (req.user as any).accountId ?? req.user.userId, res);
  }

  // ─── PASSWORD RESET ────────────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Request a password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new password using the reset token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // ─── ME ───────────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user identity from token' })
  me(@Req() req: Request & { user: any }) {
    return { user: req.user };
  }
}
