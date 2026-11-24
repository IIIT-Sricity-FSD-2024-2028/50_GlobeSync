/**
 * policy.spec.ts
 *
 * Table-driven unit test suite for centralized PolicyService:
 *  1. Booking lead time validation (>= 24h, 23h59m rejected).
 *  2. Cancellation tiers table: 73h, 72h, 71h59m, 12h, 11h59m, 0h, past departure.
 *  3. Cancellation Protection behavior (90% in Tier 1, 50% in Tier 2).
 *  4. Pre-flight preview calculation matches cancellation.
 *  5. Server-side refund creation & append-only ledger entries.
 *  6. Idempotency & double-cancel prevention (cannot refund twice).
 *  7. Timezone differences (IST +05:30 vs EST -05:00 vs UTC).
 *  8. Settings changed after booking (snapshot immutability).
 *  9. Emergency override workflow (< 12h, reason, audit logs, threshold & Admin approval).
 */

import 'reflect-metadata';
import * as assert from 'assert';
import { BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { testDb } from '../database/test-database';

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
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

async function runAllTests() {
  console.log('\n======================================================');
  console.log('GlobeSync Part 4 — Centralized PolicyService Test Suite');
  console.log('======================================================\n');

  const policyService = new PolicyService();

  // Reset testDb for clean state
  testDb.reset();

  const BASE_NOW = new Date('2026-11-22T12:00:00.000Z');

  // Helper to create dates offset by exact hours/minutes
  function addHours(date: Date, hours: number, minutes = 0, seconds = 0): Date {
    return new Date(date.getTime() + (hours * 3600 + minutes * 60 + seconds) * 1000);
  }

  // ─── 1. BOOKING LEAD TIME RULE ──────────────────────────────────────────
  console.log('--- 1. Booking Lead Time Rules (>= 24h) ---');

  await runTest('Booking lead time >= 24h (25h) is accepted', () => {
    const departure = addHours(BASE_NOW, 25);
    const result = policyService.validateBookingLeadTime(departure, BASE_NOW);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(Math.round(result.hoursUntilDeparture), 25);
  });

  await runTest('Booking lead time exactly 24h is accepted (boundary test)', () => {
    const departure = addHours(BASE_NOW, 24);
    const result = policyService.validateBookingLeadTime(departure, BASE_NOW);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(Math.round(result.hoursUntilDeparture), 24);
  });

  await runTest('Booking lead time 23h59m is strictly rejected (400 Bad Request)', () => {
    const departure = addHours(BASE_NOW, 23, 59);
    assert.throws(
      () => policyService.validateBookingLeadTime(departure, BASE_NOW),
      BadRequestException,
      'Should throw BadRequestException for lead time < 24h',
    );
  });

  await runTest('Booking lead time in past is rejected (400 Bad Request)', () => {
    const departure = addHours(BASE_NOW, -2);
    assert.throws(
      () => policyService.validateBookingLeadTime(departure, BASE_NOW),
      BadRequestException,
    );
  });

  // ─── 2. TABLE-DRIVEN CANCELLATION TIERS (STANDARD BOOKING) ───────────────
  console.log('\n--- 2. Table-Driven Cancellation Tiers (Standard, 35% penalty / 65% refund) ---');

  interface TierTestCase {
    name: string;
    hours: number;
    minutes?: number;
    expectedTier: string;
    expectedAllowed: boolean;
    expectedRefundPct: number;
    expectedPenaltyPct: number;
    requiresSupport?: boolean;
    throwsException?: any;
  }

  const standardTestCases: TierTestCase[] = [
    {
      name: '73h before departure: Tier 1 Standard (65% refund)',
      hours: 73,
      minutes: 0,
      expectedTier: 'TIER_1_STANDARD',
      expectedAllowed: true,
      expectedRefundPct: 65,
      expectedPenaltyPct: 35,
    },
    {
      name: '72h before departure (Exact Boundary): Tier 1 Standard (65% refund)',
      hours: 72,
      minutes: 0,
      expectedTier: 'TIER_1_STANDARD',
      expectedAllowed: true,
      expectedRefundPct: 65,
      expectedPenaltyPct: 35,
    },
    {
      name: '71h59m before departure: Tier 2 Late (0% refund)',
      hours: 71,
      minutes: 59,
      expectedTier: 'TIER_2_LATE',
      expectedAllowed: true,
      expectedRefundPct: 0,
      expectedPenaltyPct: 100,
    },
    {
      name: '12h before departure (Exact Boundary): Tier 2 Late (0% refund)',
      hours: 12,
      minutes: 0,
      expectedTier: 'TIER_2_LATE',
      expectedAllowed: true,
      expectedRefundPct: 0,
      expectedPenaltyPct: 100,
    },
    {
      name: '11h59m before departure: Tier 3 Blocked (< 12h requires Support)',
      hours: 11,
      minutes: 59,
      expectedTier: 'TIER_3_BLOCKED',
      expectedAllowed: false,
      expectedRefundPct: 0,
      expectedPenaltyPct: 100,
      requiresSupport: true,
      throwsException: ForbiddenException,
    },
    {
      name: '0h (Departure Time): Blocked (Cannot cancel at departure)',
      hours: 0,
      minutes: 0,
      expectedTier: 'TIER_DEPARTED',
      expectedAllowed: false,
      expectedRefundPct: 0,
      expectedPenaltyPct: 100,
      throwsException: BadRequestException,
    },
    {
      name: 'Past departure (-5h): Blocked',
      hours: -5,
      minutes: 0,
      expectedTier: 'TIER_DEPARTED',
      expectedAllowed: false,
      expectedRefundPct: 0,
      expectedPenaltyPct: 100,
      throwsException: BadRequestException,
    },
  ];

  let testBookingId = 9100;
  for (const tc of standardTestCases) {
    await runTest(`Table Test: ${tc.name}`, async () => {
      testBookingId++;
      const currentId = testBookingId;
      const departure = addHours(BASE_NOW, tc.hours, tc.minutes || 0);
      const mockBooking = {
        id: currentId,
        departure_at_utc: departure.toISOString(),
        departure_timezone: 'UTC',
        total_minor: 100000, // ₹1,000.00
        status: 'Confirmed',
        hasCancellationProtection: false,
      };

      const preview = policyService.evaluateCancellation(mockBooking, BASE_NOW);

      assert.strictEqual(preview.tier, tc.expectedTier, `Expected tier ${tc.expectedTier}, got ${preview.tier}`);
      assert.strictEqual(preview.isAllowed, tc.expectedAllowed, `Expected isAllowed=${tc.expectedAllowed}`);
      assert.strictEqual(preview.refundPercentage, tc.expectedRefundPct, `Expected refund ${tc.expectedRefundPct}%`);
      assert.strictEqual(preview.penaltyPercentage, tc.expectedPenaltyPct, `Expected penalty ${tc.expectedPenaltyPct}%`);

      if (tc.requiresSupport) {
        assert.strictEqual(preview.requiresSupportAssistance, true);
      }

      // Check cancellation execution
      if (tc.throwsException) {
        testDb.bookings.push(mockBooking);
        await assert.rejects(
          async () => policyService.cancelBooking(currentId, 'Test cancel', 1, BASE_NOW),
          tc.throwsException,
        );
      }
    });
  }

  // ─── 3. CANCELLATION PROTECTION BENEFIT TESTS ─────────────────────────────
  console.log('\n--- 3. Cancellation Protection Impact Tests ---');

  const protectedTestCases: TierTestCase[] = [
    {
      name: '73h with Protection: Tier 1 upgraded to 90% refund (10% penalty)',
      hours: 73,
      minutes: 0,
      expectedTier: 'TIER_1_STANDARD',
      expectedAllowed: true,
      expectedRefundPct: 90,
      expectedPenaltyPct: 10,
    },
    {
      name: '72h (Boundary) with Protection: Tier 1 upgraded to 90% refund',
      hours: 72,
      minutes: 0,
      expectedTier: 'TIER_1_STANDARD',
      expectedAllowed: true,
      expectedRefundPct: 90,
      expectedPenaltyPct: 10,
    },
    {
      name: '71h59m with Protection: Tier 2 upgraded from 0% to 50% refund',
      hours: 71,
      minutes: 59,
      expectedTier: 'TIER_2_LATE',
      expectedAllowed: true,
      expectedRefundPct: 50,
      expectedPenaltyPct: 50,
    },
    {
      name: '12h (Boundary) with Protection: Tier 2 upgraded from 0% to 50% refund',
      hours: 12,
      minutes: 0,
      expectedTier: 'TIER_2_LATE',
      expectedAllowed: true,
      expectedRefundPct: 50,
      expectedPenaltyPct: 50,
    },
  ];

  for (const tc of protectedTestCases) {
    await runTest(`Protected Table Test: ${tc.name}`, () => {
      const departure = addHours(BASE_NOW, tc.hours, tc.minutes || 0);
      const mockBooking = {
        id: 9902,
        departure_at_utc: departure.toISOString(),
        departure_timezone: 'UTC',
        total_minor: 200000, // ₹2,000.00
        status: 'Confirmed',
        hasCancellationProtection: true,
      };

      const preview = policyService.evaluateCancellation(mockBooking, BASE_NOW);

      assert.strictEqual(preview.tier, tc.expectedTier);
      assert.strictEqual(preview.isAllowed, tc.expectedAllowed);
      assert.strictEqual(preview.refundPercentage, tc.expectedRefundPct);
      assert.strictEqual(preview.penaltyPercentage, tc.expectedPenaltyPct);
      assert.strictEqual(preview.hasCancellationProtection, true);
      assert.strictEqual(preview.refundAmountMinor, (mockBooking.total_minor * tc.expectedRefundPct) / 100);
    });
  }

  // ─── 4. SERVER-SIDE REFUND & APPEND-ONLY LEDGER ────────────────────────────
  console.log('\n--- 4. Server-Side Refund & Append-Only Ledger Entry ---');

  await runTest('Cancellation creates refund row and append-only ledger entry', async () => {
    const departure = addHours(BASE_NOW, 80); // Tier 1
    const totalMinor = 500000; // ₹5,000.00

    const booking = {
      id: 9910,
      travelerId: 101,
      departure_at_utc: departure.toISOString(),
      departure_timezone: 'UTC',
      total_minor: totalMinor,
      status: 'Confirmed',
      hasCancellationProtection: false,
    };
    testDb.bookings = [booking];
    testDb.refunds = [];
    testDb.ledgerEntries = [];

    const result = await policyService.cancelBooking(9910, 'Traveler personal conflict', 101, BASE_NOW);

    assert.strictEqual(result.status, 'Cancelled');
    assert.strictEqual(result.refundPercentage, 65);
    assert.strictEqual(result.refundAmountMinor, 325000); // 65% of 500,000 = 325,000 (₹3,250.00)
    assert.strictEqual(result.refundAmount, 3250);

    // Verify booking mutated
    assert.strictEqual(booking.status, 'Cancelled');

    // Verify refund in testDb
    assert.strictEqual(testDb.refunds.length, 1);
    const refund = testDb.refunds[0];
    assert.strictEqual(refund.amount_minor, 325000);
    assert.strictEqual(refund.status, 'COMPLETED');

    // Verify append-only ledger entry
    assert.strictEqual(testDb.ledgerEntries.length, 1);
    const ledger = testDb.ledgerEntries[0];
    assert.strictEqual(ledger.entry_type, 'DEBIT');
    assert.strictEqual(ledger.amount_minor, 325000);
    assert.strictEqual(ledger.account_type, 'PLATFORM');
  });

  // ─── 5. DOUBLE-CANCEL PREVENTION (IDEMPOTENCY) ─────────────────────────────
  console.log('\n--- 5. Idempotency & Double-Cancel Prevention ---');

  await runTest('Calling cancelBooking twice cannot refund twice (409 Conflict)', async () => {
    const departure = addHours(BASE_NOW, 80);
    const booking = {
      id: 9920,
      travelerId: 101,
      departure_at_utc: departure.toISOString(),
      departure_timezone: 'UTC',
      total_minor: 100000,
      status: 'Confirmed',
    };
    testDb.bookings = [booking];
    testDb.refunds = [];
    testDb.ledgerEntries = [];

    // First cancel succeeds
    await policyService.cancelBooking(9920, 'First cancel', 101, BASE_NOW);
    assert.strictEqual(testDb.refunds.length, 1);
    assert.strictEqual(testDb.ledgerEntries.length, 1);

    // Second cancel must throw ConflictException
    await assert.rejects(
      async () => policyService.cancelBooking(9920, 'Second cancel attempt', 101, BASE_NOW),
      ConflictException,
      'Should throw ConflictException on already cancelled booking',
    );

    // Ensure no second refund or ledger was written
    assert.strictEqual(testDb.refunds.length, 1, 'Refunds count must remain 1');
    assert.strictEqual(testDb.ledgerEntries.length, 1, 'Ledger count must remain 1');
  });

  // ─── 6. TIMEZONE DIFFERENCE HANDLING ──────────────────────────────────────
  console.log('\n--- 6. Timezone Difference Handling ---');

  await runTest('Evaluates hours accurately regardless of offset (IST +05:30 vs EST -05:00 vs UTC)', () => {
    // 2026-11-25T17:30:00+05:30 is 2026-11-25T12:00:00.000Z in UTC
    // BASE_NOW is 2026-11-22T12:00:00.000Z -> Exactly 72.0 hours
    const istDeparture = '2026-11-25T17:30:00+05:30';
    const hoursIst = policyService.calculateHoursUntilDeparture(istDeparture, BASE_NOW, 'Asia/Kolkata');
    assert.strictEqual(Math.round(hoursIst), 72);

    // 2026-11-25T07:00:00-05:00 is also 2026-11-25T12:00:00.000Z
    const estDeparture = '2026-11-25T07:00:00-05:00';
    const hoursEst = policyService.calculateHoursUntilDeparture(estDeparture, BASE_NOW, 'America/New_York');
    assert.strictEqual(Math.round(hoursEst), 72);

    // UTC direct
    const utcDeparture = '2026-11-25T12:00:00.000Z';
    const hoursUtc = policyService.calculateHoursUntilDeparture(utcDeparture, BASE_NOW, 'UTC');
    assert.strictEqual(Math.round(hoursUtc), 72);
  });

  // ─── 7. SETTINGS CHANGED AFTER BOOKING (SNAPSHOT IMMUTABILITY) ────────────
  console.log('\n--- 7. Settings Changed After Booking (Snapshot Immutability) ---');

  await runTest('Global setting change does NOT alter existing booking snapshot refund calculation', async () => {
    const service = new PolicyService();

    // 1. Initial snapshot created when penalty is 35% (65% refund)
    const bookingSnapshot = service.createSnapshot(false);
    assert.strictEqual(bookingSnapshot.cancellationPenaltyPercent, 35);
    assert.strictEqual(bookingSnapshot.defaultRefundPercent, 65);

    const departure = addHours(BASE_NOW, 80);
    const bookingA = {
      id: 9930,
      departure_at_utc: departure.toISOString(),
      departure_timezone: 'UTC',
      total_minor: 100000,
      status: 'Confirmed',
      policy_snapshot: bookingSnapshot,
    };
    testDb.bookings = [bookingA];

    // 2. Superuser changes global cancellation penalty to 80% (which would yield only 20% refund)
    service.updateConfig({ cancellationPenaltyPercent: 80 });
    assert.strictEqual(service.getConfig().cancellationPenaltyPercent, 80);

    // 3. Evaluate Booking A: it MUST still receive 65% refund!
    const previewA = service.evaluateCancellation(bookingA, BASE_NOW);
    assert.strictEqual(
      previewA.refundPercentage,
      65,
      'Historical booking must use snapshotted 65% refund, not current 20%!',
    );
    assert.strictEqual(previewA.refundAmountMinor, 65000);

    // 4. A newly created booking created now gets the new 80% penalty (20% refund)
    const newSnapshot = service.createSnapshot(false);
    assert.strictEqual(newSnapshot.cancellationPenaltyPercent, 80);
    assert.strictEqual(newSnapshot.defaultRefundPercent, 20);

    const bookingB = {
      id: 9931,
      departure_at_utc: departure.toISOString(),
      departure_timezone: 'UTC',
      total_minor: 100000,
      status: 'Confirmed',
      policy_snapshot: newSnapshot,
    };
    const previewB = service.evaluateCancellation(bookingB, BASE_NOW);
    assert.strictEqual(previewB.refundPercentage, 20, 'New booking receives new 20% refund rule');
  });

  // ─── 8. EMERGENCY OVERRIDE (< 12h CASE) ───────────────────────────────────
  console.log('\n--- 8. Emergency Override Workflow (< 12h) ---');

  await runTest('Emergency override requires valid reason and creates audit log', async () => {
    const departure = addHours(BASE_NOW, 6); // 6h before departure (< 12h)
    const booking = {
      id: 9940,
      travelerId: 102,
      departure_at_utc: departure.toISOString(),
      departure_timezone: 'UTC',
      total_minor: 200000, // ₹2,000.00 (within 5,000.00 default threshold)
      status: 'Confirmed',
    };
    testDb.bookings = [booking];
    testDb.auditLogs = [];

    // Attempting empty reason throws BadRequestException
    await assert.rejects(
      async () =>
        policyService.requestEmergencyOverride(9940, { reason: '', supportAgentId: 6 }, BASE_NOW),
      BadRequestException,
    );

    // With reason: within threshold -> auto-approved and executed
    const result = await policyService.requestEmergencyOverride(
      9940,
      {
        reason: 'Traveler medical hospitalization emergency with valid documentation',
        supportAgentId: 6,
        supportAgentName: 'Aisha Johnson (Support)',
      },
      BASE_NOW,
    );

    assert.strictEqual(result.status, 'Cancelled');
    assert.strictEqual(result.requiresAdminApproval, false);
    assert.strictEqual(result.refundAmountMinor, 200000);
    assert.ok(result.auditLogId > 0);

    // Verify audit log exists
    assert.ok(testDb.auditLogs.length > 0);
    const lastAudit = testDb.auditLogs[testDb.auditLogs.length - 1];
    assert.strictEqual(lastAudit.action, 'EMERGENCY_OVERRIDE_EXECUTED');
  });

  await runTest('Emergency override exceeding threshold requires Admin approval and can be approved', async () => {
    const departure = addHours(BASE_NOW, 4); // 4h before departure
    const booking = {
      id: 9941,
      travelerId: 103,
      departure_at_utc: departure.toISOString(),
      departure_timezone: 'UTC',
      total_minor: 800000, // ₹8,000.00 > ₹5,000.00 threshold
      status: 'Confirmed',
    };
    testDb.bookings = [booking];
    testDb.auditLogs = [];

    // 1. Support requests override
    const reqResult = await policyService.requestEmergencyOverride(
      9941,
      {
        reason: 'Severe cyclone and airport closure',
        supportAgentId: 6,
        supportAgentName: 'Aisha Johnson',
      },
      BASE_NOW,
    );

    assert.strictEqual(reqResult.status, 'PENDING_ADMIN_APPROVAL');
    assert.strictEqual(reqResult.requiresAdminApproval, true);
    assert.strictEqual(booking.status, 'Confirmed', 'Booking stays confirmed until admin approves');

    // 2. Admin Manoj Gupta approves override
    const approveResult = await policyService.approveEmergencyOverride(
      9941,
      4, // Manoj Gupta
      'Manoj Gupta (Admin)',
      BASE_NOW,
    );

    assert.strictEqual(approveResult.status, 'Cancelled');
    assert.strictEqual(approveResult.requiresAdminApproval, false);
    assert.strictEqual(approveResult.refundAmountMinor, 800000);
    assert.strictEqual(booking.status, 'Cancelled');

    // Verify audit log for approval
    const approveAudit = testDb.auditLogs.find((l) => l.action === 'EMERGENCY_OVERRIDE_APPROVED');
    assert.ok(approveAudit, 'Must record EMERGENCY_OVERRIDE_APPROVED audit log');
  });

  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
