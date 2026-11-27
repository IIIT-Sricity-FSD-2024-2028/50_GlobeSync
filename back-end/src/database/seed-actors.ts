import { PrismaClient, Role, UserStatus, AgencyApprovalStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const SEED_ACTORS = [
  {
    email: 'superadmin@ticp.com',
    name: 'Super Admin',
    password: 'super123',
    role: Role.SUPERUSER,
    status: UserStatus.ACTIVE,
    phone: '+91 98765 00001',
    email_verified_at: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    email: 'admin@ticp.com',
    name: 'Manoj Gupta',
    password: 'admin123',
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    phone: '+91 98765 00002',
    email_verified_at: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    email: 'Arjun@gmail.com',
    name: 'Arjun Mehta',
    password: 'traveler123',
    role: Role.TRAVELER,
    status: UserStatus.ACTIVE,
    phone: '9876543210',
    gender: 'Male',
    age: 28,
    email_verified_at: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    email: 'Devansh@gmail.com',
    name: 'Devansh Sharma',
    password: 'guide123',
    role: Role.GUIDE,
    status: UserStatus.ACTIVE,
    phone: '9876543211',
    email_verified_at: new Date('2026-01-01T00:00:00.000Z'),
    guideProfile: {
      admin_set_rate_minor: 250000, // ₹2,500.00 / day
      verified_experience_years: 5,
      verified_at: new Date('2026-01-15T10:00:00.000Z'),
      bio: 'Senior Certified Alpine and Heritage Guide with 5+ years leading Himalayan and European expeditions.',
      specialties: 'Mountain Trekking, Cultural Heritage, Photography',
      languages: 'English, Hindi, French',
      location: 'Manali / New Delhi, India',
      rating: 4.9,
      total_reviews: 12,
    },
  },
  {
    email: 'ops@horizontravel.com',
    name: 'Horizon Travel Partners',
    password: 'horizon123',
    role: Role.AGENCY,
    status: UserStatus.ACTIVE,
    email_verified_at: new Date('2026-01-01T00:00:00.000Z'),
    agencyProfile: {
      business_name: 'Horizon Travel Partners',
      tax_id: 'GSTIN27AABCU9603R1ZM',
      approval_status: AgencyApprovalStatus.APPROVED,
      approved_at: new Date('2026-01-10T14:30:00.000Z'),
      payout_bank_upi: 'horizon@hdfcbank',
      phone: '9820112233',
      address: 'Tower B, Level 4, Bandra-Kurla Complex, Mumbai, Maharashtra 400051',
    },
  },
  {
    email: 'Aisha.johnson@gmail.com',
    name: 'Aisha Johnson',
    password: 'support123',
    role: Role.SUPPORT,
    status: UserStatus.ACTIVE,
    phone: '9001122334',
    email_verified_at: new Date('2026-01-01T00:00:00.000Z'),
  },
];

export async function seedActors(client: PrismaClient = prisma) {
  console.log('Seeding GlobeSync six core actor accounts (idempotent upsert)...');

  // 1. Seed Manoj Gupta (Admin) first so he can act as verifier/approver
  const manojSeed = SEED_ACTORS.find((a) => a.email === 'admin@ticp.com')!;
  const manojPasswordHash = bcrypt.hashSync(manojSeed.password, 12);
  const manoj = await client.user.upsert({
    where: { email: manojSeed.email },
    update: {
      name: manojSeed.name,
      password_hash: manojPasswordHash,
      role: manojSeed.role,
      status: manojSeed.status,
      phone: manojSeed.phone,
    },
    create: {
      email: manojSeed.email,
      name: manojSeed.name,
      password_hash: manojPasswordHash,
      role: manojSeed.role,
      status: manojSeed.status,
      phone: manojSeed.phone,
      email_verified_at: manojSeed.email_verified_at,
    },
  });

  // 2. Seed Super Admin
  const superSeed = SEED_ACTORS.find((a) => a.email === 'superadmin@ticp.com')!;
  const superPasswordHash = bcrypt.hashSync(superSeed.password, 12);
  await client.user.upsert({
    where: { email: superSeed.email },
    update: {
      name: superSeed.name,
      password_hash: superPasswordHash,
      role: superSeed.role,
      status: superSeed.status,
      phone: superSeed.phone,
    },
    create: {
      email: superSeed.email,
      name: superSeed.name,
      password_hash: superPasswordHash,
      role: superSeed.role,
      status: superSeed.status,
      phone: superSeed.phone,
      email_verified_at: superSeed.email_verified_at,
    },
  });

  // 3. Seed Arjun Mehta (Traveler)
  const arjunSeed = SEED_ACTORS.find((a) => a.email === 'Arjun@gmail.com')!;
  const arjunPasswordHash = bcrypt.hashSync(arjunSeed.password, 12);
  await client.user.upsert({
    where: { email: arjunSeed.email },
    update: {
      name: arjunSeed.name,
      password_hash: arjunPasswordHash,
      role: arjunSeed.role,
      status: arjunSeed.status,
      phone: arjunSeed.phone,
      gender: arjunSeed.gender,
      age: arjunSeed.age,
    },
    create: {
      email: arjunSeed.email,
      name: arjunSeed.name,
      password_hash: arjunPasswordHash,
      role: arjunSeed.role,
      status: arjunSeed.status,
      phone: arjunSeed.phone,
      gender: arjunSeed.gender,
      age: arjunSeed.age,
      email_verified_at: arjunSeed.email_verified_at,
    },
  });

  // 4. Seed Devansh Sharma (Guide) + GuideProfile
  const devanshSeed = SEED_ACTORS.find((a) => a.email === 'Devansh@gmail.com')!;
  const devanshPasswordHash = bcrypt.hashSync(devanshSeed.password, 12);
  const devansh = await client.user.upsert({
    where: { email: devanshSeed.email },
    update: {
      name: devanshSeed.name,
      password_hash: devanshPasswordHash,
      role: devanshSeed.role,
      status: devanshSeed.status,
      phone: devanshSeed.phone,
    },
    create: {
      email: devanshSeed.email,
      name: devanshSeed.name,
      password_hash: devanshPasswordHash,
      role: devanshSeed.role,
      status: devanshSeed.status,
      phone: devanshSeed.phone,
      email_verified_at: devanshSeed.email_verified_at,
    },
  });

  if (devanshSeed.guideProfile) {
    await client.guideProfile.upsert({
      where: { user_id: devansh.id },
      update: {
        admin_set_rate_minor: devanshSeed.guideProfile.admin_set_rate_minor,
        verified_experience_years: devanshSeed.guideProfile.verified_experience_years,
        verified_by: manoj.id,
        verified_at: devanshSeed.guideProfile.verified_at,
        bio: devanshSeed.guideProfile.bio,
        specialties: devanshSeed.guideProfile.specialties,
        languages: devanshSeed.guideProfile.languages,
        location: devanshSeed.guideProfile.location,
        rating: devanshSeed.guideProfile.rating,
        total_reviews: devanshSeed.guideProfile.total_reviews,
      },
      create: {
        user_id: devansh.id,
        admin_set_rate_minor: devanshSeed.guideProfile.admin_set_rate_minor,
        verified_experience_years: devanshSeed.guideProfile.verified_experience_years,
        verified_by: manoj.id,
        verified_at: devanshSeed.guideProfile.verified_at,
        bio: devanshSeed.guideProfile.bio,
        specialties: devanshSeed.guideProfile.specialties,
        languages: devanshSeed.guideProfile.languages,
        location: devanshSeed.guideProfile.location,
        rating: devanshSeed.guideProfile.rating,
        total_reviews: devanshSeed.guideProfile.total_reviews,
      },
    });
  }

  // 5. Seed Horizon Travel Partners (Agency) + AgencyProfile
  const horizonSeed = SEED_ACTORS.find((a) => a.email === 'ops@horizontravel.com')!;
  const horizonPasswordHash = bcrypt.hashSync(horizonSeed.password, 12);
  const horizon = await client.user.upsert({
    where: { email: horizonSeed.email },
    update: {
      name: horizonSeed.name,
      password_hash: horizonPasswordHash,
      role: horizonSeed.role,
      status: horizonSeed.status,
    },
    create: {
      email: horizonSeed.email,
      name: horizonSeed.name,
      password_hash: horizonPasswordHash,
      role: horizonSeed.role,
      status: horizonSeed.status,
      email_verified_at: horizonSeed.email_verified_at,
    },
  });

  if (horizonSeed.agencyProfile) {
    await client.agencyProfile.upsert({
      where: { user_id: horizon.id },
      update: {
        business_name: horizonSeed.agencyProfile.business_name,
        tax_id: horizonSeed.agencyProfile.tax_id,
        approval_status: horizonSeed.agencyProfile.approval_status,
        approved_by: manoj.id,
        approved_at: horizonSeed.agencyProfile.approved_at,
        payout_bank_upi: horizonSeed.agencyProfile.payout_bank_upi,
        phone: horizonSeed.agencyProfile.phone,
        address: horizonSeed.agencyProfile.address,
      },
      create: {
        user_id: horizon.id,
        business_name: horizonSeed.agencyProfile.business_name,
        tax_id: horizonSeed.agencyProfile.tax_id,
        approval_status: horizonSeed.agencyProfile.approval_status,
        approved_by: manoj.id,
        approved_at: horizonSeed.agencyProfile.approved_at,
        payout_bank_upi: horizonSeed.agencyProfile.payout_bank_upi,
        phone: horizonSeed.agencyProfile.phone,
        address: horizonSeed.agencyProfile.address,
      },
    });
  }

  // 6. Seed Aisha Johnson (Support)
  const aishaSeed = SEED_ACTORS.find((a) => a.email === 'Aisha.johnson@gmail.com')!;
  const aishaPasswordHash = bcrypt.hashSync(aishaSeed.password, 12);
  await client.user.upsert({
    where: { email: aishaSeed.email },
    update: {
      name: aishaSeed.name,
      password_hash: aishaPasswordHash,
      role: aishaSeed.role,
      status: aishaSeed.status,
      phone: aishaSeed.phone,
    },
    create: {
      email: aishaSeed.email,
      name: aishaSeed.name,
      password_hash: aishaPasswordHash,
      role: aishaSeed.role,
      status: aishaSeed.status,
      phone: aishaSeed.phone,
      email_verified_at: aishaSeed.email_verified_at,
    },
  });

  console.log('Successfully seeded all 6 actor accounts with hashed credentials and profiles.');
}

if (require.main === module) {
  seedActors()
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
