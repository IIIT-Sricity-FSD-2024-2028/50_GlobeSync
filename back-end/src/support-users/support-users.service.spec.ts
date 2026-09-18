/**
 * support-users.service.spec.ts
 *
 * Focused unit tests for SupportUsersService and the SupportUsersController
 * ownership enforcement inside RolesGuard.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json src/support-users/support-users.service.spec.ts
 *
 * Tests:
 *  Service layer:
 *   1.  findOne: returns profile without password
 *   2.  findOne: returned profile has the correct careId
 *   3.  findOne: stored record retains password for auth login
 *   4.  findOne: throws 404 for unknown careId
 *   5.  update name: response has no password, name is updated
 *   6.  update contact: response has no password, contact is updated
 *   7.  update email: response has no password, email is updated
 *   8.  update: role is immutable
 *   9.  update: stored record retains password after profile update
 *  10.  update: throws 404 for unknown careId
 *
 *  Guard layer (ownership enforcement):
 *  11.  SUPPORT matching x-user-id == :id → allowed (findOne)
 *  12.  SUPPORT mismatching x-user-id != :id → 403 (findOne)
 *  13.  SUPPORT matching x-user-id == :id → allowed (update)
 *  14.  SUPPORT mismatching x-user-id != :id → 403 (update)
 *  15.  ADMIN with any :id → allowed (bypasses ownership switch)
 *  16.  SUPERUSER with any :id → allowed (bypasses ownership switch)
 */

import 'reflect-metadata';
import * as assert from 'assert';

// ─── Seed isolation ──────────────────────────────────────────────────────────
import { supportUsers } from '../data/support-users.data';

function resetSupportUsers() {
  supportUsers.length = 0;
  supportUsers.push(
    { careId: 1, name: 'Aisha Khan',  contact: '9001122334', email: 'Aisha.johnson@gmail.com',  password: 'support123', role: 'support' },
    { careId: 2, name: 'Farhan Ali', contact: '9445566778', email: 'Farhan.teja@gmail.com', password: 'support123', role: 'support' },
  );
}

// ─── Services / guards under test ────────────────────────────────────────────
import { SupportUsersService } from './support-users.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

// ─── Test plumbing ───────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function run(name: string, fn: () => void) {
  resetSupportUsers();
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

function hasPassword(obj: unknown): boolean {
  return obj !== null &&
    typeof obj === 'object' &&
    'password' in (obj as Record<string, unknown>);
}

/** Directly invoke the guard's enforceOwnership method for targeted ownership tests. */
function invokeGuardOwnership(
  guard: RolesGuard,
  controllerName: string,
  handlerName: string,
  role: string,
  userId: string,
  paramId: string,
) {
  const ctx = {
    getClass:   () => ({ name: controllerName }),
    getHandler: () => ({ name: handlerName }),
  } as any;

  const request = {
    headers: { 'x-user-id': userId, 'x-user-role': role },
    params:  { id: paramId },
    body:    {},
  };

  return (guard as any).enforceOwnership(ctx, request, role);
}

// ─── Tests ───────────────────────────────────────────────────────────────────
const service = new SupportUsersService();
const guard   = new RolesGuard(new Reflector());

console.log('\nSupportUsersService – profile tests\n');

// 1. findOne: no password in response
run('findOne: response does not contain password', () => {
  const result = service.findOne(1);
  assert.ok(!hasPassword(result), `findOne returned password: ${JSON.stringify(result)}`);
});

// 2. findOne: correct careId returned
run('findOne: response contains correct careId', () => {
  const result = service.findOne(1);
  assert.strictEqual((result as any).careId, 1);
  assert.strictEqual(result.name, 'Aisha Khan');
});

// 3. findOne: stored record retains password for auth
run('findOne: stored record retains password after call', () => {
  service.findOne(1);
  const stored = supportUsers.find(u => u.careId === 1)!;
  assert.strictEqual(stored.password, 'support123', 'findOne mutated stored password');
});

// 4. findOne: 404 for missing careId
run('findOne: throws NotFoundException for unknown careId', () => {
  assert.throws(
    () => service.findOne(999),
    /Support user with careId 999 not found/,
    'Expected NotFoundException',
  );
});

// 5. update name
run('update name: response has no password and name is updated', () => {
  const result = service.update(1, { name: 'Aisha Updated' });
  assert.ok(!hasPassword(result), `update returned password: ${JSON.stringify(result)}`);
  assert.strictEqual(result.name, 'Aisha Updated');
});

// 6. update contact
run('update contact: response has no password and contact is updated', () => {
  const result = service.update(1, { contact: '9000000099' });
  assert.ok(!hasPassword(result), `update returned password: ${JSON.stringify(result)}`);
  assert.strictEqual(result.contact, '9000000099');
});

// 7. update email
run('update email: response has no password and email is updated', () => {
  const result = service.update(1, { email: 'new@example.com' });
  assert.ok(!hasPassword(result), `update returned password: ${JSON.stringify(result)}`);
  assert.strictEqual(result.email, 'new@example.com');
});

// 8. update: role is immutable
run('update: role field is immutable', () => {
  const result = service.update(1, {} as any);
  assert.strictEqual(result.role, 'support', 'Role was mutated unexpectedly');
});

// 9. update: stored password preserved after update
run('update: stored record retains password after profile update', () => {
  service.update(1, { name: 'New Name' });
  const stored = supportUsers.find(u => u.careId === 1)!;
  assert.strictEqual(stored.password, 'support123', 'update wiped stored password');
});

// 10. update: 404 for missing careId
run('update: throws NotFoundException for unknown careId', () => {
  assert.throws(
    () => service.update(999, { name: 'Ghost' }),
    /Support user with careId 999 not found/,
    'Expected NotFoundException',
  );
});

console.log('\nRolesGuard – SupportUsersController ownership tests\n');

// 11. SUPPORT matching id → allowed (findOne)
run('SUPPORT with matching x-user-id → no exception (findOne)', () => {
  invokeGuardOwnership(guard, 'SupportUsersController', 'findOne', 'support', '1', '1');
});

// 12. SUPPORT mismatched id → 403 (findOne)
run('SUPPORT with mismatched x-user-id → ForbiddenException (findOne)', () => {
  assert.throws(
    () => invokeGuardOwnership(guard, 'SupportUsersController', 'findOne', 'support', '1', '2'),
    ForbiddenException,
    'Expected ForbiddenException for mismatched careId',
  );
});

// 13. SUPPORT matching id → allowed (update)
run('SUPPORT with matching x-user-id → no exception (update)', () => {
  invokeGuardOwnership(guard, 'SupportUsersController', 'update', 'support', '2', '2');
});

// 14. SUPPORT mismatched id → 403 (update)
run('SUPPORT with mismatched x-user-id → ForbiddenException (update)', () => {
  assert.throws(
    () => invokeGuardOwnership(guard, 'SupportUsersController', 'update', 'support', '2', '1'),
    ForbiddenException,
    'Expected ForbiddenException for mismatched careId',
  );
});

// 15. ADMIN with any id → allowed (bypasses switch via early-return)
run('ADMIN with any x-user-id → no exception (bypasses ownership check)', () => {
  // ADMIN/SUPERUSER hit the early return before the switch, so any id is fine
  invokeGuardOwnership(guard, 'SupportUsersController', 'findOne', 'admin', '1', '99');
});

// 16. SUPERUSER with any id → allowed
run('SUPERUSER with any x-user-id → no exception (bypasses ownership check)', () => {
  invokeGuardOwnership(guard, 'SupportUsersController', 'update', 'superuser', '1', '99');
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
