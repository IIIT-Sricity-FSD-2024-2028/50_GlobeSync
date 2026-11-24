import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { travelers, guides, admins, supportUsers, agencies } from '../data';

/**
 * Identity bridge between the authentication store (testDb / Prisma `users`, one
 * numeric id per account across ALL roles) and the business data store
 * (`src/data/*.data.ts`, which keys every record by a role-specific profile id such
 * as travelerId, guideId, adminId, careId and agencyId).
 *
 * Every trip, booking, message and ownership check uses the role-specific profile
 * id, so the JWT must carry that id (`pid`) and the API must authorise against it.
 * Before this bridge existed, Arjun (account 3, travelerId 1) and Devansh
 * (account 4, guideId 1) could not see or own any of their own records.
 */

export type ProfileRole = 'traveler' | 'guide' | 'admin' | 'superuser' | 'support' | 'agency';

export interface LegacyAccount {
  role: ProfileRole;
  profileId: number;
  name: string;
  password?: string;
  /** null when the account may sign in, otherwise the reason it may not */
  blockedReason: string | null;
}

const same = (a?: string, b?: string) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Find the business-data record for an email, across every role collection. */
export function findLegacyAccount(email: string): LegacyAccount | null {
  const t = travelers.find((x) => same(x.email, email));
  if (t) return { role: 'traveler', profileId: t.travelerId, name: t.name, password: t.password, blockedReason: null };

  const g = guides.find((x) => same(x.email, email));
  if (g) return { role: 'guide', profileId: g.guideId, name: g.name, password: g.password, blockedReason: null };

  const a = admins.find((x) => same(x.email, email));
  if (a) {
    return {
      role: a.role,
      profileId: a.adminId,
      name: a.name,
      password: a.password,
      blockedReason: a.status === 'deactivated' ? 'Account is deactivated. Contact the platform owner.' : null,
    };
  }

  const s = supportUsers.find((x) => same(x.email, email));
  if (s) {
    const status = (s as any).status;
    return {
      role: 'support',
      profileId: s.careId,
      name: s.name,
      password: s.password,
      blockedReason: status === 'deactivated' ? 'Account is deactivated. Contact the platform owner.' : null,
    };
  }

  const ag = agencies.find((x) => same(x.contactEmail, email));
  if (ag) {
    return {
      role: 'agency',
      profileId: ag.agencyId,
      name: ag.businessName,
      password: ag.password,
      blockedReason:
        ag.status === 'approved'
          ? null
          : `Agency account is ${ag.status}. Only approved agencies can log in.`,
    };
  }
  return null;
}

/** Role-specific profile id for an authenticated account (falls back to the account id). */
export function resolveProfileId(role: string, email: string, accountId: number | string): number {
  const acc = findLegacyAccount(email);
  if (acc && (acc.role === role || (role === 'admin' && acc.role === 'superuser') || (role === 'superuser' && acc.role === 'admin'))) {
    return acc.profileId;
  }
  return Number(accountId);
}

/** Create the business-data traveler record for a newly registered traveler. */
export function ensureLegacyTraveler(input: { email: string; name: string; phone?: string | null; gender?: string | null; age?: number | null }): number {
  const existing = travelers.find((x) => same(x.email, input.email));
  if (existing) return existing.travelerId;
  const nextId = travelers.reduce((m, x) => Math.max(m, x.travelerId), 0) + 1;
  travelers.push({
    travelerId: nextId,
    name: input.name,
    email: input.email,
    phone: input.phone ?? '',
    gender: input.gender ?? '',
    age: Number(input.age ?? 0),
  });
  return nextId;
}

/** Create the business-data agency record (status pending) for a newly registered agency. */
export function ensureLegacyAgency(input: { email: string; businessName: string; phone?: string | null; taxId?: string | null; address?: string | null; contactPerson?: string | null }): number {
  const existing = agencies.find((x) => same(x.contactEmail, input.email));
  if (existing) return existing.agencyId;
  const nextId = agencies.reduce((m, x) => Math.max(m, x.agencyId), 0) + 1;
  agencies.push({
    agencyId: nextId,
    businessName: input.businessName,
    contactPerson: input.contactPerson ?? input.businessName,
    contactEmail: input.email,
    contactPhone: input.phone ?? '',
    status: 'pending',
    licenseGstin: input.taxId ?? '',
    officeAddress: input.address ?? '',
    createdAt: new Date().toISOString(),
    role: 'agency',
  } as any);
  return nextId;
}

/** Verify a password stored in the business-data collections (bcrypt hash or legacy plaintext). */
export async function verifyLegacyPassword(stored: string | undefined, supplied: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith('$2')) return bcrypt.compare(supplied, stored);
  const a = Buffer.from(stored);
  const b = Buffer.from(supplied);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Hash a password before it is stored in a business-data collection. */
export function hashLegacyPassword(plain: string | undefined): string | undefined {
  if (!plain) return plain;
  if (plain.startsWith('$2')) return plain;
  return bcrypt.hashSync(plain, 10);
}

/**
 * Keep the login store in step when a password is changed from a profile or admin
 * screen (those screens write to the business-data collections). Without this the
 * old password kept working and the new one was rejected.
 */
export function syncAuthAccount(email: string | undefined, changes: { email?: string; password?: string }): void {
  if (!email || (!changes.email && !changes.password)) return;
  // Lazy import avoids a load-order cycle between the data and database modules.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { testDb } = require('../database/test-database');
  const user = testDb.users.find((u: any) => same(u.email, email));
  if (!user) return;
  if (changes.password) {
    user.password_hash = bcrypt.hashSync(changes.password, 10);
    user.failed_login_attempts = 0;
    user.locked_until = null;
  }
  if (changes.email) user.email = changes.email;
}
