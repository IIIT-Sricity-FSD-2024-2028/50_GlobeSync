/**
 * child-resource-ownership.spec.ts
 *
 * Tests for the trip-child ownership rules added to RolesGuard for:
 * 1. ItinerariesController
 * 2. ExpensesController
 * 3. PaymentsController
 * 4. RefundsController
 *
 * Run with:
 *   npx ts-node --project tsconfig.json src/common/guards/child-resource-ownership.spec.ts
 */

import 'reflect-metadata';
import * as assert from 'assert';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { trips, bookings, payments, itineraries, expenses, refunds } from '../../data';
import { Role } from '../enums/role.enum';

// ─── Seed isolation ──────────────────────────────────────────────────────────
function resetData() {
  trips.length = 0;
  bookings.length = 0;
  payments.length = 0;
  itineraries.length = 0;
  expenses.length = 0;
  refunds.length = 0;

  // Trip 1 belongs to Traveler 1, Guide 1, Agency 1
  trips.push({ tripId: 1, travelerId: 1, guideId: 1, agencyId: 1, packageId: 1, startDate: '2026-10-01', endDate: '2026-10-10', status: 'CONFIRMED', paymentStatus: 'PAID' } as any);
  // Trip 2 belongs to Traveler 2, Guide 2, Agency 2
  trips.push({ tripId: 2, travelerId: 2, guideId: 2, agencyId: 2, packageId: 2, startDate: '2026-10-01', endDate: '2026-10-10', status: 'CONFIRMED', paymentStatus: 'PAID' } as any);

  // Booking 1 belongs to Traveler 1, Trip 1
  bookings.push({ bookingId: 1, travelerId: 1, tripId: 1, packageId: 1, bookingDate: '2026-09-01', status: 'Confirmed', totalAmount: 1000 } as any);
  // Booking 2 belongs to Traveler 2, Trip 2
  bookings.push({ bookingId: 2, travelerId: 2, tripId: 2, packageId: 2, bookingDate: '2026-09-01', status: 'Confirmed', totalAmount: 1000 } as any);

  // Payment 1 belongs to Booking 1 (Traveler 1)
  payments.push({ paymentId: 1, amount: 1000, paymentDate: '2026-09-01', method: 'Card', status: 'Paid', bookingId: 1 } as any);
  // Payment 2 belongs to Booking 2 (Traveler 2)
  payments.push({ paymentId: 2, amount: 1000, paymentDate: '2026-09-01', method: 'Card', status: 'Paid', bookingId: 2 } as any);
  // Payment 3 belongs to Trip 1 (Traveler 1) directly
  payments.push({ paymentId: 3, amount: 1000, paymentDate: '2026-09-01', method: 'Card', status: 'Paid', tripId: 1 } as any);

  // Refund 1 belongs to Payment 1 (Traveler 1)
  refunds.push({ refundId: 1, paymentId: 1, refundDate: '2026-09-02', refundTime: '10:00', refundStatus: 'Processing' } as any);

  // Itinerary 1 belongs to Trip 1
  itineraries.push({ itineraryId: 1, tripId: 1, city: 'Test', dayNumber: 1, activity: 'Test', activityStatus: 'Pending', time: '10:00' });
  // Expense 1 belongs to Trip 1
  expenses.push({ expenseId: 1, tripId: 1, amount: 100, type: 'Food', description: 'Test' } as any);
}

// ─── Test plumbing ───────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function run(name: string, fn: () => void) {
  resetData();
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

const guard = new RolesGuard(new Reflector());

function mockContext(
  controllerName: string,
  handlerName: string,
  role: string | undefined,
  userId: string,
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  body: Record<string, unknown> = {},
) {
  return {
    getClass: () => ({ name: controllerName }),
    getHandler: () => ({ name: handlerName }),
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {
          ...(role ? { 'x-user-role': role } : {}),
          'x-user-id': userId,
        },
        params,
        query,
        body,
      }),
    }),
  } as any;
}

function enforceOwnership(
  controllerName: string,
  handlerName: string,
  role: Role,
  userId: string,
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  body: Record<string, unknown> = {},
) {
  const ctx = mockContext(controllerName, handlerName, role, userId, params, query, body);
  const req = ctx.switchToHttp().getRequest();
  return (guard as any).enforceOwnership(ctx, req, role);
}

console.log('\nItinerariesController\n');

run('TRAVELER findByTrip with owned trip', () => {
  enforceOwnership('ItinerariesController', 'findByTrip', Role.TRAVELER, '1', { tripId: '1' });
});
run('TRAVELER findByTrip with unowned trip', () => {
  assert.throws(() => enforceOwnership('ItinerariesController', 'findByTrip', Role.TRAVELER, '1', { tripId: '2' }), ForbiddenException);
});
run('GUIDE findOne with owned trip itinerary', () => {
  enforceOwnership('ItinerariesController', 'findOne', Role.GUIDE, '1', { id: '1' });
});
run('AGENCY create with owned trip body', () => {
  enforceOwnership('ItinerariesController', 'create', Role.AGENCY, '1', {}, {}, { tripId: '1' });
});

console.log('\nExpensesController\n');

run('TRAVELER findByTrip with owned trip', () => {
  enforceOwnership('ExpensesController', 'findByTrip', Role.TRAVELER, '1', { tripId: '1' });
});
run('GUIDE findByTrip with owned trip', () => {
  enforceOwnership('ExpensesController', 'findByTrip', Role.GUIDE, '1', { tripId: '1' });
});
run('AGENCY findByTrip with unowned trip', () => {
  assert.throws(() => enforceOwnership('ExpensesController', 'findByTrip', Role.AGENCY, '1', { tripId: '2' }), ForbiddenException);
});

console.log('\nPaymentsController\n');

run('TRAVELER findByBooking with owned booking', () => {
  enforceOwnership('PaymentsController', 'findByBooking', Role.TRAVELER, '1', { bookingId: '1' });
});
run('TRAVELER findByBooking with unowned booking', () => {
  assert.throws(() => enforceOwnership('PaymentsController', 'findByBooking', Role.TRAVELER, '1', { bookingId: '2' }), ForbiddenException);
});
run('TRAVELER create with owned bookingId', () => {
  enforceOwnership('PaymentsController', 'create', Role.TRAVELER, '1', {}, {}, { bookingId: '1' });
});
run('TRAVELER create with unowned bookingId', () => {
  assert.throws(() => enforceOwnership('PaymentsController', 'create', Role.TRAVELER, '1', {}, {}, { bookingId: '2' }), ForbiddenException);
});
run('TRAVELER create with owned tripId', () => {
  enforceOwnership('PaymentsController', 'create', Role.TRAVELER, '1', {}, {}, { tripId: '1' });
});
run('TRAVELER findOne with owned payment (via booking)', () => {
  enforceOwnership('PaymentsController', 'findOne', Role.TRAVELER, '1', { id: '1' });
});
run('TRAVELER findOne with owned payment (via trip)', () => {
  enforceOwnership('PaymentsController', 'findOne', Role.TRAVELER, '1', { id: '3' });
});
run('TRAVELER findOne with unowned payment', () => {
  assert.throws(() => enforceOwnership('PaymentsController', 'findOne', Role.TRAVELER, '1', { id: '2' }), ForbiddenException);
});

console.log('\nRefundsController\n');

run('TRAVELER create with owned paymentId', () => {
  enforceOwnership('RefundsController', 'create', Role.TRAVELER, '1', {}, {}, { paymentId: '1' });
});
run('TRAVELER create with unowned paymentId', () => {
  assert.throws(() => enforceOwnership('RefundsController', 'create', Role.TRAVELER, '1', {}, {}, { paymentId: '2' }), ForbiddenException);
});
run('TRAVELER findOne with owned refund (via payment)', () => {
  enforceOwnership('RefundsController', 'findOne', Role.TRAVELER, '1', { id: '1' });
});
run('TRAVELER findOne with unowned refund', () => {
  // Let's create an unowned refund temporarily for this test
  refunds.push({ refundId: 2, paymentId: 2, refundDate: '2026-09-02', refundTime: '10:00', refundStatus: 'Processing' } as any);
  assert.throws(() => enforceOwnership('RefundsController', 'findOne', Role.TRAVELER, '1', { id: '2' }), ForbiddenException);
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
