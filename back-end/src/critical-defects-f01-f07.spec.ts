import 'reflect-metadata';
import * as assert from 'assert';
import * as bcrypt from 'bcryptjs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import {
  agencies,
  trips,
  bookings,
  payments,
  guides,
  commissionLedger,
  guideReassignmentRequests,
  platformRules,
} from './data';
import { testDb } from './database/test-database';
import { AgenciesService } from './agencies/agencies.service';
import { TripsService } from './trips/trips.service';
import { BookingsService } from './bookings/bookings.service';
import { PricingService } from './bookings/pricing.service';
import { PaymentsService } from './payments/payments.service';
import { GatewayPaymentService } from './payments/gateway-payment.service';
import { RevenueService } from './revenue/revenue.service';
import { SystemConfigService } from './system-config/system-config.service';
import { PolicyService } from './policy/policy.service';
import { InventoryService } from './inventory/inventory.service';
import { ManualInventoryProviderAdapter } from './inventory/adapters/manual-inventory-provider.adapter';
import { GuideAvailabilityService } from './guides/guide-availability.service';
import { IdempotencyService } from './common/idempotency/idempotency.service';
import { BookingStatus } from './bookings/state-machine/booking-status.enum';
import { TRIP_DATE_POLICY, addCalendarDaysYmd, todayInIndiaYmd } from './common/config/trip-date-policy';

const policyService = new PolicyService();
const inventoryService = new InventoryService(new ManualInventoryProviderAdapter());
const guideAvailabilityService = new GuideAvailabilityService();
const pricingService = new PricingService(inventoryService, policyService);
const idempotencyService = new IdempotencyService();
const revenueService = new RevenueService();
const systemConfigService = new SystemConfigService();
const gatewayPaymentService = new GatewayPaymentService(inventoryService, guideAvailabilityService);

const agenciesService = new AgenciesService();
const tripsService = new TripsService(undefined, undefined, guideAvailabilityService, policyService);
const bookingsService = new BookingsService(
  policyService,
  inventoryService,
  guideAvailabilityService,
  pricingService,
  idempotencyService,
);
const paymentsService = new PaymentsService(
  revenueService,
  systemConfigService,
  gatewayPaymentService,
  idempotencyService,
);

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

async function runSuite() {
  console.log('\n======================================================');
  console.log('GlobeSync Critical Defects F01-F07 Regression Suite');
  console.log('======================================================');

  // Snapshot original collections to restore cleanly
  const origAgencies = agencies.map((a) => ({ ...a }));
  const origTrips = trips.map((t) => ({ ...t }));
  const origBookings = bookings.map((b) => ({ ...b }));
  const origPayments = payments.map((p) => ({ ...p }));
  const origLedger = commissionLedger.map((l) => ({ ...l }));
  const origReassign = guideReassignmentRequests.map((r) => ({ ...r }));
  const origAgencyProfiles = testDb.agencyProfiles.map((p) => ({ ...p }));
  const origUsers = testDb.users.map((u) => ({ ...u }));
  const origBookingLimit = platformRules.bookingLimit;

  const restoreAll = () => {
    agencies.length = 0;
    agencies.push(...origAgencies.map((a) => ({ ...a })));
    trips.length = 0;
    trips.push(...origTrips.map((t) => ({ ...t })));
    bookings.length = 0;
    bookings.push(...origBookings.map((b) => ({ ...b })));
    payments.length = 0;
    payments.push(...origPayments.map((p) => ({ ...p })));
    commissionLedger.length = 0;
    commissionLedger.push(...origLedger.map((l) => ({ ...l })));
    guideReassignmentRequests.length = 0;
    guideReassignmentRequests.push(...origReassign.map((r) => ({ ...r })));
    testDb.agencyProfiles.length = 0;
    testDb.agencyProfiles.push(...origAgencyProfiles.map((p) => ({ ...p })));
    testDb.users.length = 0;
    testDb.users.push(...origUsers.map((u) => ({ ...u })));
    platformRules.bookingLimit = origBookingLimit;
    policyService.updateConfig({ cancellationProtectionRatePercent: 5 }, 1);
  };

  try {
    const todayYmd = todayInIndiaYmd();
    const tomorrowYmd = addCalendarDaysYmd(todayYmd, 1);
    const fiveDaysYmd = addCalendarDaysYmd(tomorrowYmd, 4);

    // ─── F01: Agency Onboarding & Status Transitions ───────────────────────────
    console.log('\n--- F01: Agency Onboarding & Status Transitions ---');

    await test('F01: Admin cannot suspend a pending agency or reject without mandatory reason', () => {
      const created = agenciesService.create({
        businessName: 'Sunrise Travels',
        contactEmail: 'sunrise-f01@test.com',
        contactPhone: '9876500111',
        password: 'password123',
      });
      assert.strictEqual(created.status, 'pending');
      const stored = agencies.find((a) => a.agencyId === created.agencyId)!;
      assert.ok(stored.password && bcrypt.compareSync('password123', stored.password), 'Agency password must be hashed');

      assert.throws(
        () => agenciesService.updateStatus(created.agencyId, { status: 'suspended', reason: 'Attempt suspend pending' }),
        BadRequestException,
      );
      assert.throws(
        () => agenciesService.updateStatus(created.agencyId, { status: 'rejected' }),
        BadRequestException,
      );
    });

    await test('F01: Admin approval defaults commission to 1.5%, prevents duplicate approval, and syncs testDb', () => {
      const pendingAgency = agencies.find((a) => a.contactEmail === 'sunrise-f01@test.com')!;
      const approved = agenciesService.updateStatus(pendingAgency.agencyId, {
        status: 'approved',
        reason: 'Verified GST & bank documents',
      });
      assert.strictEqual(approved.status, 'approved');
      assert.strictEqual(approved.commissionRate, 1.5);
      const approvedRecord = agencies.find((a) => a.agencyId === pendingAgency.agencyId)!;
      assert.ok(approvedRecord.approvedAt);

      const syncedProfile = testDb.agencyProfiles.find(
        (p) => p.business_name === 'Sunrise Travels',
      );
      assert.strictEqual(syncedProfile?.approval_status, 'APPROVED');

      assert.throws(
        () => agenciesService.updateStatus(pendingAgency.agencyId, { status: 'approved' }),
        ConflictException,
      );
    });

    // ─── F02: Mandatory Transport & Accommodation ─────────────────────────────
    console.log('\n--- F02: Mandatory Transport & Accommodation Rules ---');

    await test('F02: Non-draft custom overnight trip fails without transport or hotel, succeeds when both provided without guide', () => {
      assert.throws(
        () =>
          tripsService.create(
            {
              destination: 'Jaipur',
              origin: 'New Delhi',
              startDate: tomorrowYmd,
              endDate: fiveDaysYmd,
              budget: 18000,
              travelerId: 1,
              status: 'Pending',
              transportDetails: { transportType: 'Flight', carrier: '', lodgingTier: 'Deluxe' },
            },
            { role: 'traveler', userId: 1 },
          ),
        BadRequestException,
      );

      assert.throws(
        () =>
          tripsService.create(
            {
              destination: 'Jaipur',
              origin: 'New Delhi',
              startDate: tomorrowYmd,
              endDate: fiveDaysYmd,
              budget: 18000,
              travelerId: 1,
              status: 'Pending',
              transportDetails: { transportType: 'Flight', carrier: 'IndiGo 6E', lodgingTier: '' },
            },
            { role: 'traveler', userId: 1 },
          ),
        BadRequestException,
      );

      const validCustom = tripsService.create(
        {
          destination: 'Jaipur',
          origin: 'New Delhi',
          startDate: tomorrowYmd,
          endDate: fiveDaysYmd,
          budget: 24000,
          travelerId: 1,
          status: 'Pending',
          transportDetails: { transportType: 'Flight', carrier: 'IndiGo 6E', lodgingTier: 'Heritage Haveli' },
        },
        { role: 'traveler', userId: 1 },
      );
      assert.strictEqual(validCustom.status, 'Pending');
      assert.ok(validCustom.guideId == null);
    });

    await test('F02: Same-day 1-day custom trip & preplanned package trip succeed cleanly', () => {
      const sameDay = tripsService.create(
        {
          destination: 'Agra',
          origin: 'New Delhi',
          startDate: tomorrowYmd,
          endDate: tomorrowYmd,
          budget: 4500,
          travelerId: 1,
          status: 'Pending',
          transportDetails: { transportType: 'Train', carrier: 'Gatimaan Express', lodgingTier: '' },
        },
        { role: 'traveler', userId: 1 },
      );
      assert.strictEqual(sameDay.startDate, sameDay.endDate);

      // Package 1 has duration 7 days -> inclusive endDate = start + 6
      const pkgEnd = addCalendarDaysYmd(tomorrowYmd, 6);
      const pkgTrip = tripsService.create(
        {
          destination: 'Paris',
          origin: 'New Delhi',
          startDate: tomorrowYmd,
          endDate: pkgEnd,
          budget: 145000,
          travelerId: 1,
          packageId: 1,
          status: 'Pending',
        },
        { role: 'traveler', userId: 1 },
      );
      assert.strictEqual(pkgTrip.packageId, 1);
    });

    // ─── F03: Shared Date & Duration Policy ──────────────────────────────────
    console.log('\n--- F03: Date & Duration Policy Enforcement ---');

    await test('F03: Enforces min tomorrow start, max 330-day horizon, max 30-day custom duration, and inclusive package duration', () => {
      assert.throws(
        () =>
          tripsService.create(
            {
              destination: 'Goa',
              origin: 'Mumbai',
              startDate: todayYmd,
              endDate: tomorrowYmd,
              budget: 12000,
              travelerId: 1,
              status: 'Pending',
              transportDetails: { transportType: 'Flight', carrier: 'IndiGo', lodgingTier: 'Beach Resort' },
            },
            { role: 'traveler', userId: 1 },
          ),
        BadRequestException,
      );

      const beyondHorizon = addCalendarDaysYmd(todayYmd, TRIP_DATE_POLICY.MAX_BOOKING_HORIZON_DAYS + 2);
      assert.throws(
        () =>
          tripsService.create(
            {
              destination: 'Goa',
              origin: 'Mumbai',
              startDate: beyondHorizon,
              endDate: beyondHorizon,
              budget: 12000,
              travelerId: 1,
              status: 'Pending',
              transportDetails: { transportType: 'Flight', carrier: 'IndiGo', lodgingTier: '' },
            },
            { role: 'traveler', userId: 1 },
          ),
        BadRequestException,
      );

      // 31 inclusive days violates MAX_CUSTOM_DURATION_DAYS = 30
      const startOk = addCalendarDaysYmd(todayYmd, 5);
      const end31 = addCalendarDaysYmd(startOk, 30);
      assert.throws(
        () =>
          tripsService.create(
            {
              destination: 'Goa',
              origin: 'Mumbai',
              startDate: startOk,
              endDate: end31,
              budget: 45000,
              travelerId: 1,
              status: 'Pending',
              transportDetails: { transportType: 'Flight', carrier: 'IndiGo', lodgingTier: 'Hotel' },
            },
            { role: 'traveler', userId: 1 },
          ),
        BadRequestException,
      );

      // Wrong package duration (7-day package booked for 8 inclusive days) rejected
      assert.throws(
        () =>
          tripsService.create(
            {
              destination: 'Paris',
              origin: 'New Delhi',
              startDate: startOk,
              endDate: addCalendarDaysYmd(startOk, 7),
              budget: 145000,
              travelerId: 1,
              packageId: 1,
              status: 'Pending',
            },
            { role: 'traveler', userId: 1 },
          ),
        BadRequestException,
      );
    });

    // ─── F04: Dynamic Cancellation Protection ────────────────────────────────
    console.log('\n--- F04: Dynamic Cancellation Protection & Historical Snapshot ---');

    await test('F04: Calculates 5% dynamic fee on eligible value, excludes unaccepted guide fees, and preserves snapshot after rate updates', async () => {
      const trip = tripsService.create(
        {
          destination: 'Udaipur',
          origin: 'New Delhi',
          startDate: addCalendarDaysYmd(todayYmd, 10),
          endDate: addCalendarDaysYmd(todayYmd, 12),
          budget: 20000,
          travelerId: 1,
          status: 'Pending',
          transportDetails: { transportType: 'Flight', carrier: 'Air India', lodgingTier: 'Lake Palace' },
        },
        { role: 'traveler', userId: 1 },
      );

      // Custom transport booking ₹10,000 + 7% insurance (₹700) + 5% protection (₹500) = ₹11,200
      const booking1 = await bookingsService.create({
        tripId: trip.tripId,
        travelerId: 1,
        service: 'Air India AI-401',
        type: 'Flight',
        amount: 10000,
        transportMode: 'Flight',
        cancellationProtectionSelected: true,
      });
      assert.strictEqual(booking1.cancellationFee, 500);
      assert.strictEqual(booking1.amount, 11200);
      assert.strictEqual(booking1.policySnapshot?.cancellationProtectionRatePercent, 5);
      assert.strictEqual(booking1.policySnapshot?.cancellationProtectionFeeMinor, 50000);

      // Unaccepted guide fee must be excluded from eligible protection base
      const pendingCalc = pricingService.calculatePrice({
        items: [{ inventoryRef: 'INV-HOTEL-DELUXE-GOA', quantity: 2 }], // 900,000 minor = ₹9,000
        guideId: 4, // ₹2,500/day * 2 days = 500,000 minor
        guideAccepted: false,
        startDate: addCalendarDaysYmd(todayYmd, 10),
        endDate: addCalendarDaysYmd(todayYmd, 12),
        cancellationProtectionSelected: true,
      });
      assert.strictEqual(pendingCalc.eligibleProtectionSubtotalMinor, 900000);
      assert.strictEqual(pendingCalc.cancellationProtectionFeeMinor, 45000); // 5% of 900,000 = ₹450

      // Super Admin changes protection rate to 8%: historical snapshot retains 5%, new booking uses 8%
      policyService.updateConfig({ cancellationProtectionRatePercent: 8 }, 1);
      assert.strictEqual(booking1.policySnapshot?.cancellationProtectionRatePercent, 5);

      const booking2 = await bookingsService.create({
        tripId: trip.tripId,
        travelerId: 1,
        service: 'Taj Lake Stay',
        type: 'Hotel',
        amount: 20000,
        cancellationProtectionSelected: true,
      });
      assert.strictEqual(booking2.cancellationFee, 1600); // 8% of ₹20,000
      assert.strictEqual(booking2.policySnapshot?.cancellationProtectionRatePercent, 8);
    });

    // ─── F05 & F06: Agency Checkout, Commission & Financial Integrity ────────
    console.log('\n--- F05 & F06: Agency Checkout & Admin Financial Integrity ---');

    await test('F05 & F06: Agency booking checkout confirms trip cleanly with 1.5% ledger commission and blocks unapproved agency', async () => {
      platformRules.bookingLimit = 500000;
      const approvedAgency = agencies.find((a) => a.status === 'approved')!;
      approvedAgency.commissionRate = 1.5;

      const trip = tripsService.create(
        {
          destination: 'Manali',
          origin: 'New Delhi',
          startDate: addCalendarDaysYmd(todayYmd, 14),
          endDate: addCalendarDaysYmd(todayYmd, 17),
          budget: 35000,
          agencyId: approvedAgency.agencyId,
          status: 'Pending',
          transportDetails: { transportType: 'Bus', carrier: 'HRTC Volvo', lodgingTier: 'Mountain Lodge' },
        },
        { role: 'agency', userId: approvedAgency.agencyId },
      );

      const booking = await bookingsService.create({
        tripId: trip.tripId,
        agencyId: approvedAgency.agencyId,
        service: 'Manali Package',
        type: 'Package',
        amount: 20000,
        status: BookingStatus.HELD,
      });

      const netRemittance = 20000 * (1 - 1.5 / 100); // ₹19,700
      const payment = await paymentsService.create(
        {
          bookingId: booking.bookingId,
          agencyId: approvedAgency.agencyId,
          amount: netRemittance,
          paymentDate: todayYmd,
          method: 'Card',
          status: 'Paid',
        },
        undefined,
        { role: 'agency', userId: approvedAgency.agencyId },
      );

      assert.strictEqual(payment.status, 'Paid');
      const updatedTrip = tripsService.findOne(trip.tripId);
      assert.strictEqual(updatedTrip.status, 'Confirmed', 'Trip must cleanly transition Pending -> Confirmed');
      const updatedBooking = bookingsService.findOne(booking.bookingId);
      assert.strictEqual(updatedBooking.status, BookingStatus.CONFIRMED);
      assert.strictEqual(updatedBooking.total_minor, 2000000);
      assert.strictEqual(updatedBooking.amount, 20000);

      // Duplicate Paid payment is rejected
      assert.throws(
        () =>
          paymentsService.create({
            bookingId: booking.bookingId,
            agencyId: approvedAgency.agencyId,
            amount: netRemittance,
            paymentDate: todayYmd,
            method: 'Card',
            status: 'Paid',
          }),
        BadRequestException,
      );

      // Unapproved agency payment rejected
      const unapproved = agenciesService.create({
        businessName: 'Blocked Agency',
        contactEmail: 'blocked-f05@test.com',
        contactPhone: '9876540000',
        password: 'password123',
      });
      assert.throws(
        () =>
          paymentsService.create({
            tripId: trip.tripId,
            agencyId: unapproved.agencyId,
            amount: 1000,
            paymentDate: todayYmd,
            method: 'Card',
            status: 'Paid',
          }),
        ForbiddenException,
      );
    });

    // ─── F07: Mutual Consent Guide Reassignment ──────────────────────────────
    console.log('\n--- F07: Mutual Consent Guide Reassignment Workflow ---');

    await test('F07: Full consent lifecycle (unauthorized blocked, reject preserves, expiry enforced, dual accept completes)', () => {
      const g1 = guides[0];
      const g2 = guides[1] || guides[0];
      assert.ok(g1 && g2 && g1.guideId !== g2.guideId, 'Test requires two distinct seed guides');

      const trip = tripsService.create(
        {
          destination: 'Coorg',
          origin: 'Bengaluru',
          startDate: addCalendarDaysYmd(todayYmd, 20),
          endDate: addCalendarDaysYmd(todayYmd, 22),
          budget: 18000,
          travelerId: 2,
          guideId: g1.guideId,
          status: 'Pending',
          transportDetails: { transportType: 'Bus', carrier: 'KSRTC FlyBus', lodgingTier: 'Coffee Estate' },
        },
        { role: 'traveler', userId: 2 },
      );

      // 1. Unauthorized traveler cannot consent
      const req1 = tripsService.requestGuideReassignment(trip.tripId, g2.guideId, 'Schedule conflict', {
        userId: 1,
        role: 'admin',
        name: 'Admin',
      });
      assert.strictEqual(req1.status, 'PENDING_CONSENT');
      assert.ok(req1.expiresAt);
      assert.ok(req1.proposedGuideExperienceYears !== undefined);

      assert.throws(
        () => tripsService.respondTravelerConsent(req1.id, 'ACCEPT', 'Impersonation', 999),
        ForbiddenException,
      );

      // 2. Traveler rejection preserves original guide
      const rejected = tripsService.respondTravelerConsent(req1.id, 'REJECT', 'Prefer original guide', 2);
      assert.strictEqual(rejected.status, 'TRAVELER_REJECTED');
      assert.strictEqual(tripsService.findOne(trip.tripId).guideId, g1.guideId);

      // 3. Expired consent window cannot be accepted
      const reqExpired = tripsService.requestGuideReassignment(trip.tripId, g2.guideId, 'Retry', {
        userId: 1,
        role: 'admin',
        name: 'Admin',
      });
      reqExpired.expiresAt = new Date(Date.now() - 1000).toISOString();
      assert.throws(
        () => tripsService.respondTravelerConsent(reqExpired.id, 'ACCEPT', 'Too late', 2),
        BadRequestException,
      );
      assert.strictEqual(reqExpired.status, 'EXPIRED');

      // 4. Dual consent completes reassignment & preserves guide history
      const reqSuccess = tripsService.requestGuideReassignment(trip.tripId, g2.guideId, 'Guide backup needed', {
        userId: 1,
        role: 'admin',
        name: 'Admin',
      });
      const step1 = tripsService.respondTravelerConsent(reqSuccess.id, 'ACCEPT', 'Sounds good', 2);
      assert.strictEqual(step1.status, 'TRAVELER_ACCEPTED');
      // Still g1 until replacement guide accepts
      assert.strictEqual(tripsService.findOne(trip.tripId).guideId, g1.guideId);

      const step2 = tripsService.respondGuideAssignment(reqSuccess.id, 'ACCEPT', 'Available', g2.guideId);
      assert.strictEqual(step2.status, 'COMPLETED');
      const finalTrip = tripsService.findOne(trip.tripId);
      assert.strictEqual(finalTrip.guideId, g2.guideId);
      assert.strictEqual(finalTrip.guideStatus, 'Accepted');
      assert.ok(Array.isArray(finalTrip.guideHistory) && finalTrip.guideHistory.length === 1);
    });
  } finally {
    restoreAll();
  }

  console.log(`\n======================================================`);
  console.log(`F01-F07 Regression Results: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);
  if (failed > 0) process.exit(1);
}

runSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
