import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { testDb } from '../database/test-database';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RegisterTravelerDto, RegisterAgencyDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  findLegacyAccount,
  resolveProfileId,
  ensureLegacyTraveler,
  ensureLegacyAgency,
  verifyLegacyPassword,
} from './identity.util';

/** In-memory refresh-token store used when PostgreSQL is not connected. */
interface MemoryRefreshToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}
const memoryRefreshTokens: MemoryRefreshToken[] = [];

const PROFILE_ID_KEY: Record<string, string> = {
  traveler: 'travelerId',
  guide: 'guideId',
  admin: 'adminId',
  superuser: 'adminId',
  support: 'careId',
  agency: 'agencyId',
};

const ACCESS_TOKEN_TTL = Number(process.env.JWT_ACCESS_TTL) || 2 * 60 * 60; // 2 hours (seconds)
const REFRESH_TOKEN_TTL = 7 * 24 * 3600; // 7 days (seconds)
const ROTATION_GRACE_MS = 30 * 1000;    // 30-second rotation grace window for concurrent requests
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

// argon2 v0.45 hash() may return Buffer; normalise to string
async function hashArgon2(plaintext: string): Promise<string> {
  const h = await argon2.hash(plaintext, ARGON2_OPTIONS);
  return typeof h === 'string' ? h : (h as unknown as Buffer).toString();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ─── REGISTER ─────────────────────────────────────────────────────────────

  async registerTraveler(dto: RegisterTravelerDto) {
    let existing: any = null;
    if (PrismaService.isConnected) {
      try {
        existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      } catch {
        existing = testDb.users.find((u) => u.email.toLowerCase() === dto.email.toLowerCase());
      }
    } else {
      existing = testDb.users.find((u) => u.email.toLowerCase() === dto.email.toLowerCase());
    }
    if (existing || findLegacyAccount(dto.email)) throw new ConflictException('Email already registered.');

    const passwordHash = await hashArgon2(dto.password);
    let user: any = null;
    if (PrismaService.isConnected) {
      try {
        user = await this.prisma.user.create({
          data: {
            email: dto.email,
            password_hash: passwordHash,
            role: 'TRAVELER',
            status: 'ACTIVE',
            name: dto.name,
            gender: dto.gender ?? null,
            age: dto.age ?? null,
            phone: dto.phone ?? null,
          },
        });
      } catch {
        user = null;
      }
    }

    if (!user) {
      user = {
        id: testDb.users.length + 1,
        email: dto.email,
        password_hash: passwordHash,
        role: 'TRAVELER',
        status: 'ACTIVE',
        name: dto.name,
        gender: dto.gender ?? null,
        age: dto.age ?? null,
        phone: dto.phone ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      testDb.users.push(user as any);
    }

    const travelerId = ensureLegacyTraveler({
      email: user.email,
      name: user.name,
      phone: user.phone,
      gender: user.gender,
      age: user.age,
    });

    return {
      message: 'Traveler account created. Please log in.',
      id: travelerId,
      accountId: user.id,
      travelerId,
      name: user.name,
      email: user.email,
    };
  }

  async registerAgency(dto: RegisterAgencyDto) {
    const email = dto.email || dto.contactEmail;
    if (!email) throw new BadRequestException('Email or contactEmail is required.');

    let existing: any = null;
    if (PrismaService.isConnected) {
      try {
        existing = await this.prisma.user.findUnique({ where: { email } });
      } catch {
        existing = testDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      }
    } else {
      existing = testDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    }
    if (existing || findLegacyAccount(email)) throw new ConflictException('Email already registered.');

    const passwordHash = await hashArgon2(dto.password);
    let user: any = null;
    if (PrismaService.isConnected) {
      try {
        user = await this.prisma.user.create({
          data: {
            email,
            password_hash: passwordHash,
            role: 'AGENCY',
            status: 'ACTIVE',
            name: dto.businessName,
            phone: dto.contactPhone ?? null,
            agency_profile: {
              create: {
                business_name: dto.businessName,
                tax_id: dto.taxId ?? '',
                address: dto.address ?? null,
                approval_status: 'PENDING',
              },
            },
          },
        });
      } catch {
        user = null;
      }
    }

    if (!user) {
      user = {
        id: testDb.users.length + 1,
        email,
        password_hash: passwordHash,
        role: 'AGENCY',
        status: 'ACTIVE',
        name: dto.businessName,
        phone: dto.contactPhone ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      testDb.users.push(user as any);
      testDb.agencyProfiles.push({
        id: testDb.agencyProfiles.length + 1,
        user_id: user.id,
        business_name: dto.businessName || '',
        tax_id: dto.taxId || '',
        approval_status: 'PENDING' as any,
      });
    }

    const agencyId = ensureLegacyAgency({
      email: user.email,
      businessName: dto.businessName,
      phone: dto.contactPhone ?? null,
      taxId: dto.taxId ?? null,
      address: (dto as any).address ?? null,
      contactPerson: (dto as any).contactPerson ?? null,
    });

    return {
      message: 'Agency registered. Awaiting admin approval before first login.',
      id: agencyId,
      accountId: user.id,
      email: user.email,
      businessName: dto.businessName,
    };
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, response?: any) {
    let user: any = null;
    if (PrismaService.isConnected) {
      try {
        user = await this.prisma.user.findUnique({
          where: { email: dto.email },
          include: { agency_profile: true },
        });
      } catch {
        user = null;
      }
    }

    if (!user) {
      const found = testDb.users.find((u) => u.email.toLowerCase() === dto.email.toLowerCase());
      if (found) {
        user = {
          ...found,
          agency_profile: testDb.agencyProfiles.find((a) => a.user_id === found.id),
        };
      }
    }

    // Business-data record for this email (source of truth for staff status and
    // agency approval, because the admin screens update these collections).
    const legacy = findLegacyAccount(dto.email);

    if (!user && legacy) {
      // Accounts created from the admin / superuser screens (guides, admins,
      // support staff) exist only in the business-data collections. Verify the
      // password there, then register the account in the auth store once.
      const ok = await verifyLegacyPassword(legacy.password, dto.password);
      if (!ok) throw new UnauthorizedException('Invalid email or password.');
      if (legacy.blockedReason) throw new ForbiddenException(legacy.blockedReason);
      const bcrypt = await import('bcryptjs');
      user = {
        id: testDb.users.reduce((m, u) => Math.max(m, u.id), 0) + 1,
        email: dto.email,
        name: legacy.name,
        password_hash: bcrypt.hashSync(dto.password, 10),
        role: legacy.role.toUpperCase(),
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      };
      testDb.users.push(user);
      return this.issueTokenPair(user, response);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Account lock check
    if (user.locked_until && user.locked_until > new Date()) {
      const mins = Math.ceil((user.locked_until.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account temporarily locked due to too many failed attempts. Try again in ${mins} minute(s).`,
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}. Contact support.`);
    }

    // Agency-specific approval check (auth-store copy, used when no business record exists)
    if (!legacy && user.role === 'AGENCY' && user.agency_profile) {
      if (user.agency_profile.approval_status !== 'APPROVED') {
        throw new ForbiddenException(
          `Agency account is ${user.agency_profile.approval_status.toLowerCase()}. Only approved agencies can log in.`,
        );
      }
    }

    // Password verification
    let passwordValid = false;
    try {
      if (user.password_hash.startsWith('$argon2')) {
        passwordValid = await argon2.verify(user.password_hash, dto.password);
      } else {
        const bcrypt = await import('bcryptjs');
        passwordValid = await bcrypt.compare(dto.password, user.password_hash);
      }
    } catch {
      passwordValid = false;
    }

    if (!passwordValid) {
      await this.incrementFailedAttempts(user.id, user.failed_login_attempts || 0);
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Deactivated staff / unapproved agencies (status kept in business data).
    // Checked after the password so account status is not revealed to guessers.
    if (legacy?.blockedReason) {
      throw new ForbiddenException(legacy.blockedReason);
    }

    // Reset failed attempts on success
    const memUser: any = testDb.users.find((u) => u.id === user.id && u.email === user.email);
    if (memUser) {
      memUser.failed_login_attempts = 0;
      memUser.locked_until = null;
    }
    if (PrismaService.isConnected) {
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failed_login_attempts: 0, locked_until: null, last_login_at: new Date() },
        });
      } catch {}
    }

    return this.issueTokenPair(user, response);
  }

  // ─── REFRESH ───────────────────────────────────────────────────────────────

  async refresh(rawRefreshToken: string, response?: any) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }
    const tokenHash = this.hashToken(rawRefreshToken);

    if (!PrismaService.isConnected) {
      const stored = memoryRefreshTokens.find((t) => t.token_hash === tokenHash);
      if (!stored || stored.expires_at < new Date()) {
        if (stored) stored.revoked_at = new Date();
        throw new UnauthorizedException('Refresh token is invalid or expired.');
      }

      // Check if already revoked: allow 30-second rotation grace window for concurrent requests
      if (stored.revoked_at) {
        const elapsedMs = Date.now() - new Date(stored.revoked_at).getTime();
        if (elapsedMs > ROTATION_GRACE_MS) {
          throw new UnauthorizedException('Refresh token is invalid or expired.');
        }
      } else {
        stored.revoked_at = new Date();
      }

      const user = testDb.users.find((u) => u.id === stored.user_id);
      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Refresh token is invalid or expired.');
      }
      const legacy = findLegacyAccount(user.email);
      if (legacy?.blockedReason) throw new UnauthorizedException(legacy.blockedReason);
      return this.issueTokenPair(user, response);
    }

    const stored = await this.prisma.refreshToken.findFirst({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expires_at < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revoked_at: new Date() },
        });
      }
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    // Check if already revoked: allow 30-second rotation grace window for concurrent requests
    if (stored.revoked_at) {
      const elapsedMs = Date.now() - new Date(stored.revoked_at).getTime();
      if (elapsedMs > ROTATION_GRACE_MS) {
        throw new UnauthorizedException('Refresh token is invalid or expired.');
      }
    } else {
      // Rotate: revoke old, issue new pair
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked_at: new Date() },
      });
    }

    const user = stored.user;
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }
    const legacy = findLegacyAccount(user.email);
    if (legacy?.blockedReason) throw new UnauthorizedException(legacy.blockedReason);
    return this.issueTokenPair(user, response);
  }

  // ─── LOGOUT ────────────────────────────────────────────────────────────────

  async logout(rawRefreshToken: string | undefined, userId: string, response?: any) {
    const numericUserId = parseInt(userId, 10);
    // Explicit logout revokes immediately outside the 30-second grace window
    const immediateRevocationDate = new Date(0);
    if (!PrismaService.isConnected) {
      const tokenHash = rawRefreshToken ? this.hashToken(rawRefreshToken) : null;
      memoryRefreshTokens
        .filter((t) => !t.revoked_at && (tokenHash ? t.token_hash === tokenHash : t.user_id === numericUserId))
        .forEach((t) => (t.revoked_at = immediateRevocationDate));
    } else if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { user_id: numericUserId, token_hash: tokenHash, revoked_at: null },
        data: { revoked_at: immediateRevocationDate },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { user_id: numericUserId, revoked_at: null },
        data: { revoked_at: immediateRevocationDate },
      });
    }

    if (response) {
      response.clearCookie('access_token', { path: '/' });
      response.clearCookie('refresh_token', { path: '/' });
      response.clearCookie('refresh_token', { path: '/auth/refresh' });
    }

    return { message: 'Logged out successfully.' };
  }

  // ─── FORGOT / RESET PASSWORD ───────────────────────────────────────────────

  async forgotPassword(email: string) {
    if (!PrismaService.isConnected) {
      const memUser: any = testDb.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
      if (!memUser) return { message: 'If that email is registered, a reset link has been sent.' };
      const resetToken = crypto.randomBytes(32).toString('hex');
      memUser.password_reset_token = crypto.createHash('sha256').update(resetToken).digest('hex');
      memUser.password_reset_expiry = new Date(Date.now() + 60 * 60 * 1000);
      return {
        message: 'If that email is registered, a reset link has been sent.',
        ...(process.env.NODE_ENV !== 'production' && { resetToken }),
      };
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: resetTokenHash,
        password_reset_expiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });


    return {
      message: 'If that email is registered, a reset link has been sent.',
      ...(process.env.NODE_ENV !== 'production' && { resetToken }),
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (!PrismaService.isConnected) {
      const memUser: any = testDb.users.find(
        (u: any) => u.password_reset_token === tokenHash && u.password_reset_expiry > new Date(),
      );
      if (!memUser) throw new BadRequestException('Password reset token is invalid or expired.');
      memUser.password_hash = await hashArgon2(newPassword);
      memUser.password_reset_token = null;
      memUser.password_reset_expiry = null;
      memUser.failed_login_attempts = 0;
      memUser.locked_until = null;
      memoryRefreshTokens.filter((t) => t.user_id === memUser.id && !t.revoked_at).forEach((t) => (t.revoked_at = new Date()));
      return { message: 'Password reset successfully. Please log in with your new password.' };
    }
    const user = await this.prisma.user.findFirst({
      where: {
        password_reset_token: tokenHash,
        password_reset_expiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Password reset token is invalid or expired.');
    }

    const passwordHash = await hashArgon2(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expiry: null,
        failed_login_attempts: 0,
        locked_until: null,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { user_id: user.id, revoked_at: null },
      data: { revoked_at: new Date() },
    });

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  // ─── TOKEN HELPERS ─────────────────────────────────────────────────────────

  private async issueTokenPair(user: any, response?: any) {
    const roleValue: string = typeof user.role === 'string'
      ? user.role.toLowerCase()
      : String(user.role).toLowerCase();

    const profileId = resolveProfileId(roleValue, user.email, user.id);
    const payload: JwtPayload = {
      sub: String(user.id),
      pid: profileId,
      email: user.email,
      role: roleValue,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'gs-access-secret-change-in-prod',
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

    if (PrismaService.isConnected) {
      try {
        await this.prisma.refreshToken.create({
          data: { user_id: user.id, token_hash: tokenHash, expires_at: expiresAt },
        });
      } catch {}
    } else {
      memoryRefreshTokens.push({
        id: memoryRefreshTokens.length + 1,
        user_id: Number(user.id),
        token_hash: tokenHash,
        expires_at: expiresAt,
        revoked_at: null,
      });
    }

    if (response) {
      response.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ACCESS_TOKEN_TTL * 1000,
      });
      response.cookie('refresh_token', rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: REFRESH_TOKEN_TTL * 1000,
        path: '/',
      });
    }

    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL,
      refreshToken: rawRefreshToken,
      user: {
        // `id` is the role-specific profile id used by every business record
        // (trips, bookings, messages). `accountId` is the login account id.
        id: String(profileId),
        accountId: String(user.id),
        [PROFILE_ID_KEY[roleValue] ?? 'profileId']: profileId,
        email: user.email,
        role: roleValue,
        name: user.name ?? user.email,
      },
    };
  }

  private async incrementFailedAttempts(userId: number, current: number) {
    const newCount = current + 1;
    const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
    const memUser: any = testDb.users.find((u) => u.id === userId);
    if (memUser && !PrismaService.isConnected) {
      memUser.failed_login_attempts = newCount;
      memUser.locked_until = shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
    }
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failed_login_attempts: newCount,
          locked_until: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
        },
      });
    } catch {}
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // ─── LEGACY SHIMS (kept for existing tests) ────────────────────────────────
  travelerLogin(email: string, password: string) {
    return this.login({ email, password });
  }
  staffLogin(email: string, password: string) {
    return this.login({ email, password });
  }
  agencyLogin(email: string, password: string) {
    return this.login({ email, password });
  }
}
