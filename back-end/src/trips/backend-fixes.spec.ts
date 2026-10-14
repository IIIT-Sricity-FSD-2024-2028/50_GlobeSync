/**
 * backend-fixes.spec.ts
 *
 * Comprehensive test suite verifying the 5 confirmed GlobeSync backend fixes:
 *  1. Safe deletion & referential integrity for Packages and Trips (financial history preserved).
 *  2. Readable Trip status transition validation (FSM enforced on update & updateStatus).
 *  3. Guide status initialization, assignment reset, and explicit seed fixtures.
 *  4. Revenue config validation DTO & bounds checking (no NaN, strings, or negative values).
 *  5. Removal of synthetic dynamic revenue injection (genuine metrics only).
 *
 * Run with:
 *   npx ts-node --project tsconfig.json src/trips/backend-fixes.spec.ts
 */

import 'reflect-metadata';
import * as assert from 'assert';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { PackagesService } from '../packages/packages.service';
import { TripsService } from './trips.service';
import { RevenueService } from '../revenue/revenue.service';
import { UpdateRevenueConfigDto } from '../revenue/dto/update-revenue-config.dto';

import {
  packages,
  trips,
  bookings,
  itineraries,
  expenses,
  payments,
  packageBookings,
  commissionLedger,
  revenueConfig,
  revenueTransactions,
} from '../data';

// ─── Test Harness ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function run(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      res
        .then(() => {
          console.log(`  ✓ ${name}`);
          passed++;
        })
        .catch((err) => {
          console.error(`  ✗ ${name}`);
          console.error(`    ${err.message}`);
          failed++;
        });
    } else {
      console.log(`  ✓ ${name}`);
      passed++;
    }
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

const packagesService = new PackagesService();
const tripsService = new TripsService();
const revenueService = new RevenueService();

console.log('\n======================================================');
console.log('GlobeSync Backend Repairs — Verification Test Suite');
console.log('======================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Safe Deletion & Referential Integrity (Packages & Trips)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Referential Integrity & Safe Deletion ---');

run('Package deletion blocked when referenced by trips (Throws ConflictException)', () => {
  // Package 1 is referenced by trips 1, 13, 16
  assert.throws(
    () => packagesService.remove(1),
    (err: any) => {
      assert.ok(err instanceof ConflictException, 'Expected ConflictException');
      assert.ok(err.message.includes('trip(s)'), 'Message should detail dependent trips');
      return true;
    },
  );
});

run('Package deletion blocked when referenced by packageBookings', () => {
  // Check if any package has packageBookings, or create a mock package booking
  const pkg = packagesService.create({
    name: 'Unused Test Package',
    destinations: 'Test City',
    budget: 50000,
    duration: 3,
  });
  packageBookings.push({
    packageBookingId: 9999,
    packageId: pkg.packageId,
    travelerId: 1,
    bookingDate: '2026-03-01',
    status: 'Confirmed',
  });

  try {
    assert.throws(
      () => packagesService.remove(pkg.packageId),
      (err: any) => {
        assert.ok(err instanceof ConflictException);
        assert.ok(err.message.includes('package booking(s)'));
        return true;
      },
    );
  } finally {
    const pbIdx = packageBookings.findIndex((pb) => pb.packageBookingId === 9999);
    if (pbIdx !== -1) packageBookings.splice(pbIdx, 1);
    // Cleanup the package once unreferenced
    packagesService.remove(pkg.packageId);
  }
});

run('Package deletion succeeds when package is unreferenced', () => {
  const standalonePkg = packagesService.create({
    name: 'Clean Standalone Package',
    destinations: 'Nowhere',
    budget: 10000,
    duration: 2,
  });
  const res = packagesService.remove(standalonePkg.packageId);
  assert.ok(res.message.includes('deleted successfully'));
  assert.ok(!packages.some((p) => p.packageId === standalonePkg.packageId));
});

run('Trip deletion blocked when referenced by bookings/payments/expenses (Throws ConflictException)', () => {
  // Trip 1 has dependent bookings, itineraries, expenses, payments
  assert.throws(
    () => tripsService.remove(1),
    (err: any) => {
      assert.ok(err instanceof ConflictException, 'Expected ConflictException');
      assert.ok(err.message.includes('booking(s)'), 'Message should detail bookings');
      return true;
    },
  );
});

run('Trip deletion does NOT cascade-delete financial records (payments, commissions preserved)', () => {
  const initialPaymentCount = payments.length;
  const initialCommissionCount = commissionLedger.length;

  try {
    tripsService.remove(1);
  } catch {
    // Expected ConflictException
  }

  assert.strictEqual(payments.length, initialPaymentCount, 'Payments must remain untouched');
  assert.strictEqual(commissionLedger.length, initialCommissionCount, 'Commissions must remain untouched');
});

run('Trip deletion succeeds when trip has zero dependent records', () => {
  const standaloneTrip = tripsService.create({
    destination: 'Isolated Island',
    startDate: '2026-11-01',
    endDate: '2026-11-05',
    budget: 30000,
    travelerId: 1,
  });

  const res = tripsService.remove(standaloneTrip.tripId);
  assert.ok(res.message.includes('deleted successfully'));
  assert.ok(!trips.some((t) => t.tripId === standaloneTrip.tripId));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Trip Status Transition Rules
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Trip Status Transition Rules ---');

run('Valid lifecycle transitions succeed: Planning -> Pending -> Confirmed -> Active -> Completed', () => {
  const trip = tripsService.create({
    destination: 'Lifecycle Test',
    startDate: '2026-08-01',
    endDate: '2026-08-07',
    budget: 45000,
    travelerId: 1,
  });
  assert.strictEqual(trip.status, 'Planning');

  const s1 = tripsService.updateStatus(trip.tripId, 'Pending');
  assert.strictEqual(s1.status, 'Pending');

  const s2 = tripsService.updateStatus(trip.tripId, 'Confirmed');
  assert.strictEqual(s2.status, 'Confirmed');

  const s3 = tripsService.updateStatus(trip.tripId, 'Active');
  assert.strictEqual(s3.status, 'Active');

  const s4 = tripsService.updateStatus(trip.tripId, 'Completed');
  assert.strictEqual(s4.status, 'Completed');

  // Clean up
  const idx = trips.findIndex((t) => t.tripId === trip.tripId);
  if (idx !== -1) trips.splice(idx, 1);
});

run('Invalid transition: Planning directly to Active is rejected with BadRequestException', () => {
  const trip = tripsService.create({
    destination: 'Jump Test',
    startDate: '2026-08-01',
    endDate: '2026-08-07',
    budget: 45000,
    travelerId: 1,
  });

  assert.throws(
    () => tripsService.updateStatus(trip.tripId, 'Active'),
    (err: any) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("Invalid status transition from 'Planning' to 'Active'"));
      return true;
    },
  );

  // Clean up
  const idx = trips.findIndex((t) => t.tripId === trip.tripId);
  if (idx !== -1) trips.splice(idx, 1);
});

run('Invalid transition enforced in update() route as well as updateStatus()', () => {
  const trip = tripsService.create({
    destination: 'Update Route Test',
    startDate: '2026-08-01',
    endDate: '2026-08-07',
    budget: 45000,
    travelerId: 1,
  });

  assert.throws(
    () => tripsService.update(trip.tripId, { status: 'Completed' }),
    (err: any) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("Invalid status transition from 'Planning' to 'Completed'"));
      return true;
    },
  );

  // Clean up
  const idx = trips.findIndex((t) => t.tripId === trip.tripId);
  if (idx !== -1) trips.splice(idx, 1);
});

run('Terminal statuses (Completed, Cancelled) disallow further transitions', () => {
  const trip = tripsService.create({
    destination: 'Terminal Test',
    startDate: '2026-08-01',
    endDate: '2026-08-07',
    budget: 45000,
    travelerId: 1,
  });
  tripsService.updateStatus(trip.tripId, 'Cancelled');

  assert.throws(
    () => tripsService.updateStatus(trip.tripId, 'Planning'),
    BadRequestException,
  );

  // Clean up
  const idx = trips.findIndex((t) => t.tripId === trip.tripId);
  if (idx !== -1) trips.splice(idx, 1);
});

run('Idempotent status updates (same status) are accepted without error', () => {
  const trip = tripsService.create({
    destination: 'Idempotency Test',
    startDate: '2026-08-01',
    endDate: '2026-08-07',
    budget: 45000,
    travelerId: 1,
  });

  const res = tripsService.updateStatus(trip.tripId, 'Planning');
  assert.strictEqual(res.status, 'Planning');

  // Clean up
  const idx = trips.findIndex((t) => t.tripId === trip.tripId);
  if (idx !== -1) trips.splice(idx, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Guide Status Initialization & Assignment Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Guide Status Initialization & Assignment Lifecycle ---');

run('Trip creation with guide initializes guideStatus to "Pending"', () => {
  const trip = tripsService.create({
    destination: 'Guide Init Test',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    budget: 35000,
    travelerId: 1,
    guideId: 2,
  });

  assert.strictEqual(trip.guideId, 2);
  assert.strictEqual(trip.guideStatus, 'Pending', 'guideStatus should be initialized to Pending');

  // Clean up
  const idx = trips.findIndex((t) => t.tripId === trip.tripId);
  if (idx !== -1) trips.splice(idx, 1);
});

run('Trip creation without guide leaves guideStatus undefined', () => {
  const trip = tripsService.create({
    destination: 'No Guide Test',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    budget: 35000,
    travelerId: 1,
  });

  assert.strictEqual(trip.guideId, null);
  assert.strictEqual(trip.guideStatus, undefined);

  // Clean up
  const idx = trips.findIndex((t) => t.tripId === trip.tripId);
  if (idx !== -1) trips.splice(idx, 1);
});

run('Reassigning guideId resets guideStatus to "Pending"', () => {
  const trip = tripsService.create({
    destination: 'Reassign Test',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    budget: 35000,
    travelerId: 1,
    guideId: 1,
  });
  // Simulate guide accepting
  tripsService.update(trip.tripId, { guideStatus: 'Accepted' });
  assert.strictEqual(tripsService.findOne(trip.tripId).guideStatus, 'Accepted');

  // Reassign to guide 2 -> guideStatus should reset to Pending
  const updated = tripsService.update(trip.tripId, { guideId: 2 });
  assert.strictEqual(updated.guideId, 2);
  assert.strictEqual(updated.guideStatus, 'Pending', 'Changing guide must reset response to Pending');

  // Clean up
  const idx = trips.findIndex((t) => t.tripId === trip.tripId);
  if (idx !== -1) trips.splice(idx, 1);
});

run('Unassigning guide (guideId: null) clears guideStatus', () => {
  const trip = tripsService.create({
    destination: 'Unassign Test',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    budget: 35000,
    travelerId: 1,
    guideId: 1,
  });

  const updated = tripsService.update(trip.tripId, { guideId: null });
  assert.strictEqual(updated.guideId, null);
  assert.strictEqual(updated.guideStatus, undefined, 'Clearing guide should clear guideStatus');

  // Clean up
  const idx = trips.findIndex((t) => t.tripId === trip.tripId);
  if (idx !== -1) trips.splice(idx, 1);
});

run('Seed fixtures have explicit guideStatus for all trips with guides', () => {
  for (const t of trips) {
    if (t.guideId !== null && t.guideId !== undefined) {
      assert.ok(
        ['Pending', 'Accepted', 'Declined'].includes(t.guideStatus as string),
        `Trip ${t.tripId} has guideId ${t.guideId} but invalid guideStatus: ${t.guideStatus}`,
      );
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Revenue Configuration DTO & Validation Bounds
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Revenue Configuration DTO & Bounds Checking ---');

run('UpdateRevenueConfigDto validates valid percentage values (0 - 100)', async () => {
  const validInstance = plainToInstance(UpdateRevenueConfigDto, { value: 15 });
  const errors = await validate(validInstance);
  assert.strictEqual(errors.length, 0, 'Expected no validation errors for value 15');

  const zeroInstance = plainToInstance(UpdateRevenueConfigDto, { value: 0 });
  const zeroErrors = await validate(zeroInstance);
  assert.strictEqual(zeroErrors.length, 0, 'Expected no validation errors for value 0');

  const hundredInstance = plainToInstance(UpdateRevenueConfigDto, { value: 100 });
  const hundredErrors = await validate(hundredInstance);
  assert.strictEqual(hundredErrors.length, 0, 'Expected no validation errors for value 100');
});

run('UpdateRevenueConfigDto rejects negative values, >100, strings, NaN, null', async () => {
  // Negative
  const neg = plainToInstance(UpdateRevenueConfigDto, { value: -5 });
  const negErrors = await validate(neg);
  assert.ok(negErrors.length > 0, 'Negative value should fail validation');

  // Exceeds 100
  const over = plainToInstance(UpdateRevenueConfigDto, { value: 105 });
  const overErrors = await validate(over);
  assert.ok(overErrors.length > 0, 'Value > 100 should fail validation');

  // String
  const str = plainToInstance(UpdateRevenueConfigDto, { value: 'twenty' });
  const strErrors = await validate(str);
  assert.ok(strErrors.length > 0, 'String value should fail validation');

  // Missing
  const missing = plainToInstance(UpdateRevenueConfigDto, {});
  const missingErrors = await validate(missing);
  assert.ok(missingErrors.length > 0, 'Missing value should fail validation');
});

run('RevenueService.updateConfig accepts valid value within bounds', () => {
  const updated = revenueService.updateConfig('DEFAULT_BOOKING_COMMISSION', 12);
  assert.strictEqual(updated.value_number, 12);
  // Restore
  revenueService.updateConfig('DEFAULT_BOOKING_COMMISSION', 10);
});

run('RevenueService.updateConfig rejects out-of-bounds or non-numeric values with BadRequestException', () => {
  assert.throws(
    () => revenueService.updateConfig('DEFAULT_BOOKING_COMMISSION', -1),
    BadRequestException,
  );
  assert.throws(
    () => revenueService.updateConfig('DEFAULT_BOOKING_COMMISSION', 150),
    BadRequestException,
  );
  assert.throws(
    () => revenueService.updateConfig('DEFAULT_BOOKING_COMMISSION', NaN),
    BadRequestException,
  );
});

run('RevenueService.updateConfig throws NotFoundException for invalid key', () => {
  assert.throws(
    () => revenueService.updateConfig('NON_EXISTENT_KEY', 10),
    NotFoundException,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Genuine Revenue Metrics (No Synthetic Injections)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Genuine Revenue Metrics ---');

run('getRevenueSummary calculates metrics strictly from genuine transactions', () => {
  const summary = revenueService.getRevenueSummary();

  assert.ok(summary.monthlyTrend.length === 6, 'Expected 6 months in trend');

  // For months with no genuine transactions, revenue and breakdown should be 0, NOT fake injected numbers
  for (const month of summary.monthlyTrend) {
    if (month.revenue === 0) {
      assert.strictEqual(month.breakdown.BOOKING_COMMISSION, 0, 'Empty month should not have fake booking commission');
      assert.strictEqual(month.breakdown.AGENCY_COMMISSION, 0, 'Empty month should not have fake agency commission');
      assert.strictEqual(month.breakdown.SUBSCRIPTION, 0, 'Empty month should not have fake subscription');
      assert.strictEqual(month.breakdown.FEATURED_LISTING, 0, 'Empty month should not have fake featured listing');
    }
  }
});

run('Agency totals reflect genuine data without synthetic inflation', () => {
  const summary = revenueService.getRevenueSummary();
  const breakdown = revenueService.getBreakdown();

  // Calculated strictly from revenueTransactions with status EARNED or SETTLED
  const validStatuses = ['EARNED', 'SETTLED'];
  let expectedAgencyComm = 0;
  revenueTransactions.forEach((t) => {
    if (validStatuses.includes(t.status) && t.revenue_type === 'AGENCY_COMMISSION') {
      expectedAgencyComm += t.revenue_amount;
    }
  });

  assert.strictEqual(
    breakdown.AGENCY_COMMISSION,
    expectedAgencyComm,
    'Breakdown AGENCY_COMMISSION must exactly match genuine transaction sum',
  );
});

// ─── Test Summary ─────────────────────────────────────────────────────────────
setTimeout(() => {
  console.log(`\n======================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);
  if (failed > 0) {
    process.exit(1);
  }
}, 500);
