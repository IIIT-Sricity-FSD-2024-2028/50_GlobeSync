/**
 * booking-concurrency.spec.ts
 *
 * Comprehensive test suite for Part 5:
 *  1. Concurrent booking of last seat (one succeeds, second rejected with 409 Conflict).
 *  2. Expired hold releases inventory and frees guide availability after 15 min.
 *  3. Booking status state machine: valid lifecycle vs illegal transitions throw.
 *  4. Idempotency-Key header on booking creation prevents duplicate booking.
 *  5. Server-side price calculation: price tampering from client is completely ignored.
 *  6. Guide double-booking prevention: overlapping dates atomically blocked.
 *  7. Gateway test mode webhook signature verification & safe replay.
 */

import 'reflect-metadata';
import * as assert from 'assert';
import * as crypto from 'crypto';
import { ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { InventoryService } from '../inventory/inventory.service';
import { ManualInventoryProviderAdapter } from '../inventory/adapters/manual-inventory-provider.adapter';
import { GuideAvailabilityService } from '../guides/guide-availability.service';
import { PricingService } from './pricing.service';
import { HoldExpiryService } from './hold-expiry.service';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { GatewayPaymentService } from '../payments/gateway-payment.service';
import { BookingStateMachine } from './state-machine/booking-state-machine';
import { BookingStatus } from './state-machine/booking-status.enum';
import { PolicyService } from '../policy/policy.service';
import { testDb } from '../database/test-database';
import { bookings, trips } from '../data';

// Fixture: bookings must now reference an existing, open trip (referential integrity),
// so create the trips these scenarios book against.
for (let id = 101; id <= 110; id++) {
  if (!trips.some((t) => t.tripId === id)) {
    trips.push({
      tripId: id, title: `Fixture trip ${id}`, origin: 'Delhi', destination: 'Goa',
      startDate: '2027-06-01', endDate: '2027-06-05', budget: 50000, travelerId: 1,
      guideId: null, status: 'Pending',
    } as any);
  }
}

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
  console.log('GlobeSync Part 5 — Concurrency, Inventory & Payment Suite');
  console.log('======================================================\n');

  // Initialize service dependencies
  const manualAdapter = new ManualInventoryProviderAdapter();
  const inventoryService = new InventoryService(manualAdapter);
  const guideAvailabilityService = new GuideAvailabilityService();
  const pricingService = new PricingService(inventoryService);
  const idempotencyService = new IdempotencyService();
  const policyService = new PolicyService();
  const holdExpiryService = new HoldExpiryService(inventoryService, guideAvailabilityService);
  const gatewayPaymentService = new GatewayPaymentService(inventoryService, guideAvailabilityService);

  const bookingsService = new BookingsService(
    policyService,
    inventoryService,
    guideAvailabilityService,
    pricingService,
    idempotencyService,
  );

  const BASE_NOW = new Date('2026-11-22T12:00:00.000Z');

  // Helper to add future dates
  function getFutureIso(days: number): string {
    return new Date(BASE_NOW.getTime() + days * 24 * 3600 * 1000).toISOString();
  }

  // ─── 1. CONCURRENT BOOKING OF LAST SEAT ─────────────────────────────────────
  console.log('--- 1. Concurrency: Last Seat / Room Protection ---');

  await runTest('Concurrent booking of last seat: First user takes seat, second is blocked with 409 Conflict', async () => {
    // Reset inventory to clean seed
    inventoryService.resetSeed();

    const lastSeatRef = 'INV-HOTEL-SINGLE-SEAT-MANALI'; // capacity = 1
    const item = inventoryService.findByRefOrThrow(lastSeatRef);
    assert.strictEqual(item.capacity, 1);
    assert.strictEqual(item.heldQuantity, 0);
    assert.strictEqual(item.bookedQuantity, 0);

    const departure = getFutureIso(5);

    // User A booking
    const bookingA = await bookingsService.create({
      tripId: 101,
      travelerId: 3, // Arjun Mehta
      service: 'Manali Boutique Hotel Hold',
      type: 'Hotel',
      amount: 0,
      departureAtUtc: departure,
      items: [{ inventoryRef: lastSeatRef, quantity: 1 }],
    });

    assert.ok(bookingA.bookingId > 0);
    assert.strictEqual(bookingA.status, BookingStatus.HELD);
    assert.ok(bookingA.holdExpiresAtUtc !== undefined);

    // Verify item held quantity incremented to capacity limit
    const itemAfterA = inventoryService.findByRefOrThrow(lastSeatRef);
    assert.strictEqual(itemAfterA.heldQuantity, 1);
    assert.strictEqual(itemAfterA.capacity - itemAfterA.heldQuantity, 0);

    // User B tries to book the same last seat concurrently -> Must throw ConflictException
    await assert.rejects(
      async () => {
        await bookingsService.create({
          tripId: 102,
          travelerId: 10,
          service: 'Manali Boutique Hotel Hold Attempt',
          type: 'Hotel',
          amount: 0,
          departureAtUtc: departure,
          items: [{ inventoryRef: lastSeatRef, quantity: 1 }],
        });
      },
      ConflictException,
      'Should throw ConflictException when requesting exhausted inventory capacity',
    );
  });

  // ─── 2. EXPIRED HOLD RELEASES INVENTORY & GUIDE ────────────────────────────
  console.log('\n--- 2. Hold Expiry & Automatic Inventory Release (15 min) ---');

  await runTest('Expired hold releases inventory seats and frees guide dates', async () => {
    inventoryService.resetSeed();
    testDb.guideBlockedDates = [];

    const itemRef = 'INV-HOTEL-SINGLE-SEAT-MANALI'; // capacity = 1
    const departure = getFutureIso(5);
    const startDate = '2026-12-01';
    const endDate = '2026-12-05';
    const guideDevanshId = 4;

    // 1. User holds the last seat + guide Devansh
    const booking = await bookingsService.create({
      tripId: 103,
      travelerId: 3,
      service: 'Manali Hotel + Guide',
      type: 'Package',
      amount: 0,
      departureAtUtc: departure,
      startDate,
      endDate,
      guideId: guideDevanshId,
      items: [{ inventoryRef: itemRef, quantity: 1 }],
    });

    assert.strictEqual(booking.status, BookingStatus.HELD);
    assert.strictEqual(inventoryService.findByRefOrThrow(itemRef).heldQuantity, 1);
    assert.strictEqual(guideAvailabilityService.checkAvailability(guideDevanshId, startDate, endDate), false);

    // 2. Advance time past the 15-minute hold limit (16 minutes later)
    const futureTime = new Date(new Date(booking.heldAt || Date.now()).getTime() + 16 * 60 * 1000);

    const expiryResult = await holdExpiryService.checkAndReleaseExpiredHolds(futureTime);
    assert.ok(expiryResult.releasedCount >= 1);
    assert.ok(expiryResult.expiredBookingIds.includes(booking.bookingId));

    // 3. Verify booking status transitioned to EXPIRED
    assert.strictEqual(booking.status, BookingStatus.EXPIRED);

    // 4. Verify inventory capacity is released back to available
    const itemAfterExpiry = inventoryService.findByRefOrThrow(itemRef);
    assert.strictEqual(itemAfterExpiry.heldQuantity, 0, 'Held quantity must be 0 after expiry');

    // 5. Verify guide Devansh is unblocked and available again
    const isGuideNowAvailable = guideAvailabilityService.checkAvailability(guideDevanshId, startDate, endDate);
    assert.strictEqual(isGuideNowAvailable, true, 'Guide dates must be freed after hold expiry');

    // 6. Another traveler can now hold the previously locked seat and guide!
    const bookingB = await bookingsService.create({
      tripId: 104,
      travelerId: 5,
      service: 'Manali Hotel + Guide Second Attempt',
      type: 'Package',
      amount: 0,
      departureAtUtc: departure,
      startDate,
      endDate,
      guideId: guideDevanshId,
      items: [{ inventoryRef: itemRef, quantity: 1 }],
    });

    assert.strictEqual(bookingB.status, BookingStatus.HELD);
    assert.strictEqual(inventoryService.findByRefOrThrow(itemRef).heldQuantity, 1);
  });

  // ─── 3. BOOKING STATUS STATE MACHINE ───────────────────────────────────────
  console.log('\n--- 3. Booking Status State Machine Enforcement ---');

  await runTest('State Machine allows valid lifecycle transitions (DRAFT -> HELD -> PAID -> CONFIRMED -> COMPLETED)', () => {
    assert.strictEqual(BookingStateMachine.canTransition('DRAFT', 'HELD'), true);
    assert.strictEqual(BookingStateMachine.canTransition('HELD', 'PAID'), true);
    assert.strictEqual(BookingStateMachine.canTransition('PAID', 'CONFIRMED'), true);
    assert.strictEqual(BookingStateMachine.canTransition('CONFIRMED', 'COMPLETED'), true);
  });

  await runTest('State Machine strictly throws on illegal transitions', () => {
    // DRAFT cannot jump directly to CONFIRMED
    assert.throws(
      () => BookingStateMachine.assertValidTransition('DRAFT', 'CONFIRMED'),
      ConflictException,
    );

    // EXPIRED cannot be transitioned to PAID
    assert.throws(
      () => BookingStateMachine.assertValidTransition('EXPIRED', 'PAID'),
      ConflictException,
    );

    // COMPLETED cannot be transitioned back to HELD
    assert.throws(
      () => BookingStateMachine.assertValidTransition('COMPLETED', 'HELD'),
      ConflictException,
    );

    // CANCELLED cannot transition to PAID
    assert.throws(
      () => BookingStateMachine.assertValidTransition('CANCELLED', 'PAID'),
      ConflictException,
    );
  });

  await runTest('State Machine transitions via BookingsService.update enforce valid rules', () => {
    const mockBooking = {
      bookingId: 9801,
      bookingDate: '2026-11-22',
      status: BookingStatus.HELD,
      tripId: 101,
      travelerId: 3,
      service: 'Test Tour',
      type: 'Tour' as any,
      amount: 1000,
      total_minor: 100000,
    };
    bookings.push(mockBooking);

    // Illegal jump HELD -> COMPLETED throws ConflictException
    assert.throws(
      () => bookingsService.update(9801, { status: 'COMPLETED' }),
      ConflictException,
    );

    // Legal transition HELD -> CANCELLED succeeds
    const updated = bookingsService.update(9801, { status: 'CANCELLED' });
    assert.strictEqual(updated.status, BookingStatus.CANCELLED);
  });

  // ─── 4. IDEMPOTENCY-KEY HEADER ON BOOKING CREATION ─────────────────────────
  console.log('\n--- 4. Idempotency-Key Header on Create Booking ---');

  await runTest('Replaying create-booking with same Idempotency-Key returns cached response without double-booking', async () => {
    const itemRef = 'INV-TOUR-HERITAGE-JAIPUR';
    const initialItem = inventoryService.findByRefOrThrow(itemRef);
    const initialHeld = initialItem.heldQuantity;
    const initialBookingsCount = bookings.length;

    const idempotencyKey = `idemp_booking_key_${Date.now()}`;
    const payload = {
      tripId: 105,
      travelerId: 3,
      service: 'Jaipur Heritage Walking Tour',
      type: 'Tour',
      amount: 0,
      departureAtUtc: getFutureIso(4),
      items: [{ inventoryRef: itemRef, quantity: 2 }],
    };

    // First call with Idempotency-Key
    const firstRes = await bookingsService.create(payload, idempotencyKey);
    assert.ok(firstRes.bookingId > 0);
    assert.strictEqual(bookings.length, initialBookingsCount + 1);
    assert.strictEqual(inventoryService.findByRefOrThrow(itemRef).heldQuantity, initialHeld + 2);

    // Second call with identical Idempotency-Key
    const secondRes = await bookingsService.create(payload, idempotencyKey);

    // Must return exact same booking ID
    assert.strictEqual(secondRes.bookingId, firstRes.bookingId);
    // Must NOT add a new booking
    assert.strictEqual(bookings.length, initialBookingsCount + 1);
    // Must NOT increment held quantity again
    assert.strictEqual(inventoryService.findByRefOrThrow(itemRef).heldQuantity, initialHeld + 2);
  });

  // ─── 5. SERVER-SIDE PRICE COMPUTATION & TAMPERING PREVENTION ───────────────
  console.log('\n--- 5. Server-Side Price Engine & Tampering Prevention ---');

  await runTest('Price tampering from client is completely ignored; computed authoritatively by server', async () => {
    const hotelRef = 'INV-HOTEL-DELUXE-GOA'; // ₹4,500.00 / night (450,000 minor)
    const tourRef = 'INV-TOUR-HERITAGE-JAIPUR'; // ₹1,200.00 / person (120,000 minor)
    const guideDevanshId = 4; // ₹2,500.00 / day (250,000 minor)

    // Attacker sends forged amount = ₹1.00 (amount: 1)
    const tamperedPayload = {
      tripId: 106,
      travelerId: 3,
      service: 'Goa & Jaipur Tour + Guide Devansh',
      type: 'Package',
      amount: 1, // MALICIOUS CLIENT TAMPERING
      departureAtUtc: getFutureIso(5),
      startDate: '2026-12-10',
      endDate: '2026-12-12', // 2 days
      guideId: guideDevanshId,
      transportMode: 'Flight',
      cancellationProtectionSelected: true,
      items: [
        { inventoryRef: hotelRef, quantity: 2 }, // 2 * 450,000 = 900,000
        { inventoryRef: tourRef, quantity: 3 },  // 3 * 120,000 = 360,000
      ],
    };

    const booking = await bookingsService.create(tamperedPayload);

    // Verify calculated breakdown:
    // Items Subtotal: 900,000 + 360,000 = 1,260,000
    // Guide Subtotal: 2 days * 250,000 = 500,000
    // Base Subtotal: 1,760,000
    // Insurance (7%): 1,760,000 * 0.07 = 123,200
    // Cancellation Protection Fee (Flight): 10,000 (₹100)
    // Taxes (5% GST): 1,760,000 * 0.05 = 88,000
    // Total Minor: 1,760,000 + 123,200 + 10,000 + 88,000 = 1,981,200 (₹19,812.00)

    assert.notStrictEqual(booking.amount, 1, 'Client forged price must NOT be used');
    assert.strictEqual(booking.total_minor, 1981200, 'Server must compute exact authoritative totalMinor');
    assert.strictEqual(booking.amount, 19812, 'Server amount must be ₹19,812.00');
  });

  // ─── 6. GUIDE ATOMIC DOUBLE-BOOKING CHECK ──────────────────────────────────
  console.log('\n--- 6. Guide Availability: Atomic Date Overlap Prevention ---');

  await runTest('Guide cannot be double-booked on overlapping dates; non-overlapping dates are allowed', async () => {
    testDb.guideBlockedDates = [];
    const guideDevanshId = 4;
    const departure = getFutureIso(6);

    // Booking 1: Devansh booked 2026-12-01 to 2026-12-05
    const booking1 = await bookingsService.create({
      tripId: 107,
      travelerId: 3,
      service: 'Golden Triangle Guide',
      type: 'Activity',
      amount: 0,
      departureAtUtc: departure,
      startDate: '2026-12-01',
      endDate: '2026-12-05',
      guideId: guideDevanshId,
    });
    assert.ok(booking1.bookingId > 0);

    // Booking 2: Attempting overlapping dates (2026-12-03 to 2026-12-07) -> Must throw ConflictException
    await assert.rejects(
      async () => {
        await bookingsService.create({
          tripId: 108,
          travelerId: 5,
          service: 'Overlapping Guide Booking Attempt',
          type: 'Activity',
          amount: 0,
          departureAtUtc: departure,
          startDate: '2026-12-03',
          endDate: '2026-12-07',
          guideId: guideDevanshId,
        });
      },
      ConflictException,
      'Should throw ConflictException when booking guide on overlapping dates',
    );

    // Booking 3: Non-overlapping dates (2026-12-06 to 2026-12-10) -> Must succeed!
    const booking3 = await bookingsService.create({
      tripId: 109,
      travelerId: 5,
      service: 'Subsequent Non-overlapping Guide Booking',
      type: 'Activity',
      amount: 0,
      departureAtUtc: departure,
      startDate: '2026-12-06',
      endDate: '2026-12-10',
      guideId: guideDevanshId,
    });
    assert.ok(booking3.bookingId > 0);
  });

  // ─── 7. REAL GATEWAY TEST MODE & WEBHOOK REPLAY SAFETY ─────────────────────
  console.log('\n--- 7. Gateway Webhook Signature Verification & Replay Safety ---');

  await runTest('Webhook signature verification: Valid HMAC signature accepted, forged signature rejected (401)', async () => {
    const rawBody = JSON.stringify({
      event: 'payment.captured',
      id: `evt_test_${Date.now()}`,
      payload: { payment: { entity: { id: 'pay_test_123', notes: { bookingId: 1 } } } },
    });

    const secret = 'whsec_globesync_test_secret_2026';
    const validSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const forgedSignature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    // Valid signature passes
    const isValid = gatewayPaymentService.verifyWebhookSignature(rawBody, validSignature, secret);
    assert.strictEqual(isValid, true);

    // Forged signature fails
    const isForgedValid = gatewayPaymentService.verifyWebhookSignature(rawBody, forgedSignature, secret);
    assert.strictEqual(isForgedValid, false);

    // Process with forged signature throws UnauthorizedException
    await assert.rejects(
      async () => gatewayPaymentService.processWebhook(JSON.parse(rawBody), forgedSignature, rawBody),
      UnauthorizedException,
    );
  });

  await runTest('Webhook drives booking HELD -> PAID -> CONFIRMED and replay is safe (idempotent)', async () => {
    // Create a fresh booking in HELD state
    const departure = getFutureIso(7);
    const booking = await bookingsService.create({
      tripId: 110,
      travelerId: 3,
      service: 'Webhook Test Trip',
      type: 'Package',
      amount: 15000,
      departureAtUtc: departure,
    });
    assert.strictEqual(booking.status, BookingStatus.HELD);

    const secret = 'whsec_globesync_test_secret_2026';
    const eventId = `evt_capture_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      id: eventId,
      payload: {
        payment: {
          entity: {
            id: `pay_order_${Date.now()}`,
            amount: booking.total_minor,
            currency: 'INR',
            notes: { bookingId: booking.bookingId },
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    // 1. First webhook execution -> transitions booking to CONFIRMED
    const firstResult = await gatewayPaymentService.processWebhook(payload, signature, rawBody);
    assert.strictEqual(firstResult.success, true);
    assert.strictEqual(firstResult.status, 'CONFIRMED');
    assert.strictEqual(booking.status, BookingStatus.CONFIRMED);

    // 2. Webhook replay (duplicate delivery from gateway) -> safe idempotent return
    const replayResult = await gatewayPaymentService.processWebhook(payload, signature, rawBody);
    assert.strictEqual(replayResult.success, true);
    assert.strictEqual(replayResult.status, 'ALREADY_PROCESSED');
    // Booking status remains CONFIRMED without errors or double processing
    assert.strictEqual(booking.status, BookingStatus.CONFIRMED);
  });

  // Finish
  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
