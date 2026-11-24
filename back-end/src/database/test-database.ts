import { PrismaClient, Role, UserStatus, AgencyApprovalStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

/**
 * Isolated Test Database / Transaction Manager
 *
 * Provides isolated database operations for test suites, supporting
 * both live PostgreSQL (with transaction rollback) and an in-memory
 * state store seeded ONLY with the 6 core actor accounts.
 */

export interface TestUserRecord {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  status: UserStatus;
  phone?: string;
  gender?: string;
  age?: number;
  email_verified_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TestGuideProfileRecord {
  id: number;
  user_id: number;
  admin_set_rate_minor: number;
  verified_experience_years: number;
  verified_by?: number | null;
  verified_at?: Date | null;
  bio?: string;
  specialties?: string;
  languages?: string;
  location?: string;
  rating: number;
  total_reviews: number;
}

export interface TestAgencyProfileRecord {
  id: number;
  user_id: number;
  business_name: string;
  tax_id: string;
  approval_status: AgencyApprovalStatus;
  approved_by?: number | null;
  approved_at?: Date | null;
  payout_bank_upi?: string;
  phone?: string;
  address?: string;
}

export class TestDatabase {
  private static instance: TestDatabase;

  public users: TestUserRecord[] = [];
  public guideProfiles: TestGuideProfileRecord[] = [];
  public agencyProfiles: TestAgencyProfileRecord[] = [];
  public trips: any[] = [];
  public bookings: any[] = [];
  public payments: any[] = [];
  public refunds: any[] = [];
  public reviews: any[] = [];
  public expenses: any[] = [];
  public itineraries: any[] = [];
  public messages: any[] = [];
  public supportTickets: any[] = [];
  public packages: any[] = [];
  public commissions: any[] = [];
  public promoCodes: any[] = [];
  public subscriptions: any[] = [];
  public subscriptionPlans: any[] = [];
  public auditLogs: any[] = [];
  public ledgerEntries: any[] = [];
  public inventoryItems: any[] = [];
  public guideBlockedDates: any[] = [];
  public paymentIntents: any[] = [];
  public notifications: any[] = [];
  public processedWebhooks: Set<string> = new Set<string>();
  public systemConfigs: Record<string, any> = {};

  private snapshotState: string = '';

  private constructor() {
    this.seedActors();
    this.saveSnapshot();
  }

  public static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  public seedActors() {
    this.users = [];
    this.guideProfiles = [];
    this.agencyProfiles = [];

    // 1. Super Admin (ID 1)
    this.users.push({
      id: 1,
      email: 'superadmin@ticp.com',
      name: 'Super Admin',
      password_hash: bcrypt.hashSync('super123', 12),
      role: Role.SUPERUSER,
      status: UserStatus.ACTIVE,
      phone: '+91 98765 00001',
      email_verified_at: new Date('2026-01-01T00:00:00Z'),
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });

    // 2. Manoj Gupta (Admin, ID 2)
    this.users.push({
      id: 2,
      email: 'admin@ticp.com',
      name: 'Manoj Gupta',
      password_hash: bcrypt.hashSync('admin123', 12),
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      phone: '+91 98765 00002',
      email_verified_at: new Date('2026-01-01T00:00:00Z'),
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });

    // 3. Arjun Mehta (Traveler, ID 3)
    this.users.push({
      id: 3,
      email: 'Arjun@gmail.com',
      name: 'Arjun Mehta',
      password_hash: bcrypt.hashSync('traveler123', 12),
      role: Role.TRAVELER,
      status: UserStatus.ACTIVE,
      phone: '9876543210',
      gender: 'Male',
      age: 28,
      email_verified_at: new Date('2026-01-01T00:00:00Z'),
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });

    // 4. Devansh Sharma (Guide, ID 4)
    this.users.push({
      id: 4,
      email: 'Devansh@gmail.com',
      name: 'Devansh Sharma',
      password_hash: bcrypt.hashSync('guide123', 12),
      role: Role.GUIDE,
      status: UserStatus.ACTIVE,
      phone: '9876543211',
      email_verified_at: new Date('2026-01-01T00:00:00Z'),
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });

    this.guideProfiles.push({
      id: 1,
      user_id: 4,
      admin_set_rate_minor: 250000, // ₹2,500.00 / day
      verified_experience_years: 5,
      verified_by: 2, // verified by Manoj Gupta
      verified_at: new Date('2026-01-15T10:00:00Z'),
      bio: 'Senior Certified Alpine and Heritage Guide with 5+ years leading Himalayan and European expeditions.',
      specialties: 'Mountain Trekking, Cultural Heritage, Photography',
      languages: 'English, Hindi, French',
      location: 'Manali / New Delhi, India',
      rating: 4.9,
      total_reviews: 12,
    });

    // 5. Horizon Travel Partners (Agency, ID 5)
    this.users.push({
      id: 5,
      email: 'ops@horizontravel.com',
      name: 'Horizon Travel Partners',
      password_hash: bcrypt.hashSync('horizon123', 12),
      role: Role.AGENCY,
      status: UserStatus.ACTIVE,
      email_verified_at: new Date('2026-01-01T00:00:00Z'),
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });

    this.agencyProfiles.push({
      id: 1,
      user_id: 5,
      business_name: 'Horizon Travel Partners',
      tax_id: 'GSTIN27AABCU9603R1ZM',
      approval_status: AgencyApprovalStatus.APPROVED,
      approved_by: 2, // approved by Manoj Gupta
      approved_at: new Date('2026-01-10T14:30:00Z'),
      payout_bank_upi: 'horizon@hdfcbank',
      phone: '9820112233',
      address: 'Tower B, Level 4, Bandra-Kurla Complex, Mumbai, Maharashtra 400051',
    });

    // 6. Aisha Johnson (Support, ID 6)
    this.users.push({
      id: 6,
      email: 'Aisha.johnson@gmail.com',
      name: 'Aisha Johnson',
      password_hash: bcrypt.hashSync('support123', 12),
      role: Role.SUPPORT,
      status: UserStatus.ACTIVE,
      phone: '9001122334',
      email_verified_at: new Date('2026-01-01T00:00:00Z'),
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });

    // Default System Config
    this.systemConfigs = {
      'cancellation_policy': {
        tier1_hours: 72,
        tier1_refund_percent: 65,
        tier2_hours: 12,
        tier2_refund_percent: 0,
      },
      'platform_commission_percent': 10,
    };
  }

  public saveSnapshot() {
    this.snapshotState = JSON.stringify({
      users: this.users,
      guideProfiles: this.guideProfiles,
      agencyProfiles: this.agencyProfiles,
      trips: this.trips,
      bookings: this.bookings,
      payments: this.payments,
      refunds: this.refunds,
      reviews: this.reviews,
      expenses: this.expenses,
      itineraries: this.itineraries,
      messages: this.messages,
      supportTickets: this.supportTickets,
      packages: this.packages,
      commissions: this.commissions,
      promoCodes: this.promoCodes,
      subscriptions: this.subscriptions,
      subscriptionPlans: this.subscriptionPlans,
      auditLogs: this.auditLogs,
      ledgerEntries: this.ledgerEntries,
      inventoryItems: this.inventoryItems,
      guideBlockedDates: this.guideBlockedDates,
      paymentIntents: this.paymentIntents,
      processedWebhooks: Array.from(this.processedWebhooks || []),
      systemConfigs: this.systemConfigs,
    });
  }

  public reset() {
    this.rollback();
  }

  public rollback() {
    if (this.snapshotState) {
      const state = JSON.parse(this.snapshotState);
      this.users = state.users;
      this.guideProfiles = state.guideProfiles;
      this.agencyProfiles = state.agencyProfiles;
      this.trips = state.trips;
      this.bookings = state.bookings;
      this.payments = state.payments;
      this.refunds = state.refunds;
      this.reviews = state.reviews;
      this.expenses = state.expenses;
      this.itineraries = state.itineraries;
      this.messages = state.messages;
      this.supportTickets = state.supportTickets;
      this.packages = state.packages;
      this.commissions = state.commissions;
      this.promoCodes = state.promoCodes;
      this.subscriptions = state.subscriptions;
      this.subscriptionPlans = state.subscriptionPlans;
      this.auditLogs = state.auditLogs || [];
      this.ledgerEntries = state.ledgerEntries || [];
      this.inventoryItems = state.inventoryItems || [];
      this.guideBlockedDates = state.guideBlockedDates || [];
      this.paymentIntents = state.paymentIntents || [];
      this.processedWebhooks = new Set<string>(state.processedWebhooks || []);
      this.systemConfigs = state.systemConfigs || {};
    } else {
      this.seedActors();
    }
  }

  public resetAll() {
    this.seedActors();
    this.trips = [];
    this.bookings = [];
    this.payments = [];
    this.refunds = [];
    this.reviews = [];
    this.expenses = [];
    this.itineraries = [];
    this.messages = [];
    this.supportTickets = [];
    this.packages = [];
    this.commissions = [];
    this.promoCodes = [];
    this.subscriptions = [];
    this.auditLogs = [];
    this.ledgerEntries = [];
    this.saveSnapshot();
  }
}

export const testDb = TestDatabase.getInstance();
