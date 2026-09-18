/**
 * roles-guard-ownership.spec.ts
 *
 * Tests for the ownership rules added to RolesGuard for:
 * 1. DashboardController (AGENCY)
 * 2. GuidesController (GUIDE)
 * 3. MessagesController
 * 4. ReviewsController (TRAVELER trip ownership)
 *
 * Run with:
 *   npx ts-node --project tsconfig.json src/common/guards/roles-guard-ownership.spec.ts
 */

import 'reflect-metadata';
import * as assert from 'assert';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { trips } from '../../data';
import { Role } from '../enums/role.enum';

// ─── Seed isolation ──────────────────────────────────────────────────────────
function resetData() {
  trips.length = 0;
  trips.push(
    { tripId: 101, travelerId: 1, packageId: 1, agencyId: 1, startDate: '2026-10-01', endDate: '2026-10-10', status: 'CONFIRMED', paymentStatus: 'PAID' } as any,
    { tripId: 102, travelerId: 2, packageId: 2, agencyId: 2, startDate: '2026-11-01', endDate: '2026-11-10', status: 'CONFIRMED', paymentStatus: 'PAID' } as any
  );
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

console.log('\nDashboardController\n');

run('AGENCY getAgencyDashboard with matching ID', () => {
  enforceOwnership('DashboardController', 'getAgencyDashboard', Role.AGENCY, '1', { agencyId: '1' });
});

run('AGENCY getAgencyDashboard with mismatching ID', () => {
  assert.throws(
    () => enforceOwnership('DashboardController', 'getAgencyDashboard', Role.AGENCY, '1', { agencyId: '2' }),
    ForbiddenException
  );
});

console.log('\nGuidesController\n');

run('GUIDE update with matching ID', () => {
  enforceOwnership('GuidesController', 'update', Role.GUIDE, '1', { id: '1' });
});

run('GUIDE update with mismatching ID', () => {
  assert.throws(
    () => enforceOwnership('GuidesController', 'update', Role.GUIDE, '1', { id: '2' }),
    ForbiddenException
  );
});

console.log('\nMessagesController\n');

run('findByUser: matches role type and ID', () => {
  enforceOwnership('MessagesController', 'findByUser', Role.TRAVELER, '1', { userType: 'traveler', userId: '1' });
});

run('findByUser: mismatches role type', () => {
  assert.throws(
    () => enforceOwnership('MessagesController', 'findByUser', Role.TRAVELER, '1', { userType: 'guide', userId: '1' }),
    ForbiddenException
  );
});

run('findByUser: mismatches ID', () => {
  assert.throws(
    () => enforceOwnership('MessagesController', 'findByUser', Role.TRAVELER, '1', { userType: 'traveler', userId: '2' }),
    ForbiddenException
  );
});

run('findConversation: caller is sender', () => {
  enforceOwnership('MessagesController', 'findConversation', Role.TRAVELER, '1', {}, { senderType: 'traveler', senderId: '1', receiverType: 'guide', receiverId: '2' });
});

run('findConversation: caller is receiver', () => {
  enforceOwnership('MessagesController', 'findConversation', Role.GUIDE, '2', {}, { senderType: 'traveler', senderId: '1', receiverType: 'guide', receiverId: '2' });
});

run('findConversation: caller is neither', () => {
  assert.throws(
    () => enforceOwnership('MessagesController', 'findConversation', Role.TRAVELER, '3', {}, { senderType: 'traveler', senderId: '1', receiverType: 'guide', receiverId: '2' }),
    ForbiddenException
  );
});

run('create: matches role type and ID', () => {
  enforceOwnership('MessagesController', 'create', Role.SUPPORT, '4', {}, {}, { sender: 'support', senderId: 4 });
});

run('create: mismatches role type', () => {
  assert.throws(
    () => enforceOwnership('MessagesController', 'create', Role.SUPPORT, '4', {}, {}, { sender: 'guide', senderId: 4 }),
    ForbiddenException
  );
});

run('create: mismatches ID', () => {
  assert.throws(
    () => enforceOwnership('MessagesController', 'create', Role.SUPPORT, '4', {}, {}, { sender: 'support', senderId: 5 }),
    ForbiddenException
  );
});

console.log('\nReviewsController\n');

run('create: TRAVELER owns trip and matches ID', () => {
  enforceOwnership('ReviewsController', 'create', Role.TRAVELER, '1', {}, {}, { travelerId: 1, tripId: 101 });
});

run('create: TRAVELER mismatches travelerId', () => {
  assert.throws(
    () => enforceOwnership('ReviewsController', 'create', Role.TRAVELER, '1', {}, {}, { travelerId: 2, tripId: 101 }),
    ForbiddenException
  );
});

run('create: TRAVELER trip does not belong to them', () => {
  assert.throws(
    () => enforceOwnership('ReviewsController', 'create', Role.TRAVELER, '1', {}, {}, { travelerId: 1, tripId: 102 }),
    ForbiddenException
  );
});

run('create: TRAVELER trip does not exist', () => {
  assert.throws(
    () => enforceOwnership('ReviewsController', 'create', Role.TRAVELER, '1', {}, {}, { travelerId: 1, tripId: 999 }),
    ForbiddenException
  );
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
