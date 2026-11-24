import { Injectable, UnauthorizedException } from '@nestjs/common';
import { travelers } from '../data';
import { admins } from '../data';
import { guides } from '../data';
import { supportUsers } from '../data';
import { agencies } from '../data';

/**
 * AuthServiceLegacy — the original in-memory synchronous auth service.
 * Kept solely for backward compatibility with existing spec files
 * (agencies.service.spec.ts, admins.service.spec.ts) that call these
 * methods synchronously without a database.
 *
 * DO NOT use in production. The real auth is handled by auth/auth.service.ts
 * which uses bcrypt/argon2 + PostgreSQL + JWT.
 */
@Injectable()
export class AuthServiceLegacy {
  travelerLogin(email: string, password: string) {
    const traveler = travelers.find(
      (t) =>
        t.email.toLowerCase() === email.toLowerCase() &&
        t.password === password,
    );
    if (!traveler) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const { password: _, ...userWithoutPassword } = traveler;
    return { message: 'Login successful', role: 'traveler', user: userWithoutPassword };
  }

  staffLogin(email: string, password: string) {
    const admin = admins.find(
      (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password,
    );
    if (admin) {
      const { password: _, ...userWithoutPassword } = admin;
      return { message: 'Login successful', role: admin.role, user: userWithoutPassword };
    }
    const guide = guides.find(
      (g) => g.email.toLowerCase() === email.toLowerCase() && g.password === password,
    );
    if (guide) {
      const { password: _, ...userWithoutPassword } = guide;
      return { message: 'Login successful', role: 'guide', user: userWithoutPassword };
    }
    const support = supportUsers.find(
      (s) => s.email.toLowerCase() === email.toLowerCase() && s.password === password,
    );
    if (support) {
      const { password: _, ...userWithoutPassword } = support;
      return { message: 'Login successful', role: 'support', user: userWithoutPassword };
    }
    throw new UnauthorizedException('Invalid email or password');
  }

  agencyLogin(email: string, password: string) {
    const agency = agencies.find(
      (a) =>
        a.contactEmail.toLowerCase() === email.toLowerCase() &&
        a.password === password,
    );
    if (!agency) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (agency.status !== 'approved') {
      throw new UnauthorizedException(`Agency account is ${agency.status}. Only approved agencies can log in.`);
    }
    const { password: _, ...userWithoutPassword } = agency;
    return { message: 'Login successful', role: 'agency', user: userWithoutPassword };
  }
}

// Default export alias so existing specs that do `new AuthService()` with no args still work
// when they import from '../auth/auth.service'.
export { AuthServiceLegacy as AuthService };
