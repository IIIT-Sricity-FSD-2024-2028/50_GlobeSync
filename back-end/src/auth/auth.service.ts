import { Injectable, UnauthorizedException } from '@nestjs/common';
import { travelers } from '../data';
import { admins } from '../data';
import { guides } from '../data';
import { supportUsers } from '../data';

@Injectable()
export class AuthService {
  /**
   * Traveler login — match email + password from in-memory travelers data.
   * Returns the traveler object (without password) and role.
   */
  travelerLogin(email: string, password: string) {
    const traveler = travelers.find(
      (t) =>
        t.email.toLowerCase() === email.toLowerCase() &&
        t.password === password,
    );

    if (!traveler) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = traveler;
    return {
      message: 'Login successful',
      role: 'traveler',
      user: userWithoutPassword,
    };
  }

  /**
   * Staff login — searches admins, guides, and support users.
   * Returns the matched user (without password) and their role.
   */
  staffLogin(email: string, password: string) {
    // Check administrators (admin + superuser)
    const admin = admins.find(
      (a) =>
        a.email.toLowerCase() === email.toLowerCase() &&
        a.password === password,
    );
    if (admin) {
      const { password: _, ...userWithoutPassword } = admin;
      return {
        message: 'Login successful',
        role: admin.role, // 'admin' or 'superuser'
        user: userWithoutPassword,
      };
    }

    // Check guides
    const guide = guides.find(
      (g) =>
        g.email.toLowerCase() === email.toLowerCase() &&
        g.password === password,
    );
    if (guide) {
      const { password: _, ...userWithoutPassword } = guide;
      return {
        message: 'Login successful',
        role: 'guide',
        user: userWithoutPassword,
      };
    }

    // Check support users
    const support = supportUsers.find(
      (s) =>
        s.email.toLowerCase() === email.toLowerCase() &&
        s.password === password,
    );
    if (support) {
      const { password: _, ...userWithoutPassword } = support;
      return {
        message: 'Login successful',
        role: 'support',
        user: userWithoutPassword,
      };
    }

    throw new UnauthorizedException('Invalid email or password');
  }
}
