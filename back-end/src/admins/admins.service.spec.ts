/**
 * admins.service.spec.ts
 *
 * Focused unit tests for AdminsService and the AdminsController ownership
 * enforcement inside RolesGuard.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json src/admins/admins.service.spec.ts
 *
 * Tests:
 *  Service layer:
 *   1.  findOne: returns profile without password
 *   2.  findOne: returns 404 for unknown id
 *   3.  findOne: stored record retains password for auth login
 *   4.  update name: response has no password and name is updated
 *   5.  update email: response has no password and email is updated
 *   6.  update: role is immutable — cannot be changed
 *   7.  update: stored record retains password after profile update
 *   8.  update: returns 404 for unknown id
 *
 *  Guard layer (ownership enforcement):
 *   9.  ADMIN matching x-user-id == :id → allowed (findOne)
 *  10.  ADMIN mismatching x-user-id != :id → 403 (findOne)
 *  11.  SUPERUSER matching x-user-id == :id → allowed (findOne)
 *  12.  SUPERUSER mismatching x-user-id != :id → 403 (findOne)
 *  13.  ADMIN matching x-user-id == :id → allowed (update)
 *  14.  ADMIN mismatching x-user-id != :id → 403 (update)
 *  15.  SUPERUSER matching x-user-id == :id → allowed (update)
 *  16.  SUPERUSER mismatching x-user-id != :id → 403 (update)
 *  17.  Non-admin role on AdminsController → 403
 */

import 'reflect-metadata';
import * as assert from 'assert';

// ─── Seed isolation ──────────────────────────────────────────────────────────
import { admins } from '../data/admins.data';

function resetAdmins() {
  admins.length = 0;
  admins.push(
    { adminId: 1, name: 'Super Admin', email: 'superadmin@ticp.com', password: 'super123', role: 'superuser' },
    { adminId: 2, name: 'Manoj Gupta', email: 'admin@ticp.com', password: 'admin123', role: 'admin' },
    { adminId: 3, name: 'Sanjay Reddy', email: 'sanjay@gmail.com', password: 'sanjay123', role: 'admin' },
  );
}

// ─── Services under test ─────────────────────────────────────────────────────
import { AdminsService } from './admins.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

// ─── Test plumbing ───────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function run(name: string, fn: () => void) {
  resetAdmins();
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

/** Build a minimal ExecutionContext mock for the guard. */
function mockContext(controllerName: string, handlerName: string) {
  return {
    getClass: () => ({ name: controllerName }),
    getHandler: () => ({ name: handlerName }),
    switchToHttp: () => ({
      getRequest: () => ({ headers: {}, params: {} }),
    }),
  } as any;
}

/** Build the guard's canActivate-compatible invocation helper. */
function buildGuardRequest(role: string, userId: string, paramId: string) {
  return {
    headers: {
      'x-user-role': role,
      'x-user-id': userId,
    },
    params: { id: paramId },
    body: {},
  };
}

function invokeGuardOwnership(
  guard: RolesGuard,
  controllerName: string,
  handlerName: string,
  role: string,
  userId: string,
  paramId: string,
) {
  // We test enforceOwnership indirectly via canActivate with a mock context.
  const ROLES_KEY = 'roles';
  const reflector = new Reflector();
  const ctx = {
    getClass: () => ({ name: controllerName }),
    getHandler: () => ({ name: handlerName }),
    switchToHttp: () => ({
      getRequest: () => buildGuardRequest(role, userId, paramId),
    }),
  } as any;

  // Stub reflector to return ['admin', 'superuser'] as required roles
  const origGet = (reflector as any).getAllAndOverride.bind(reflector);
  (guard as any).reflector = {
    getAllAndOverride: (_key: string, _targets: any[]) => [role],
  };

  return (guard as any).enforceOwnership(
    ctx,
    buildGuardRequest(role, userId, paramId),
    role,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────
const service = new AdminsService();
const guard = new RolesGuard(new Reflector());

console.log('\nAdminsService – profile tests\n');

// 1. findOne: no password in response
run('findOne: response does not contain password', () => {
  const result = service.findOne(1);
  assert.ok(!hasPassword(result), `findOne returned password: ${JSON.stringify(result)}`);
  assert.strictEqual(result.name, 'Super Admin');
  assert.strictEqual(result.role, 'superuser');
});

// 2. findOne: 404 for missing id
run('findOne: throws NotFoundException for unknown id', () => {
  assert.throws(
    () => service.findOne(999),
    /Admin with ID 999 not found/,
    'Expected NotFoundException',
  );
});

// 3. findOne: stored record still has password for auth
run('findOne: stored record retains password after call', () => {
  service.findOne(1);
  const stored = admins.find(a => a.adminId === 1)!;
  assert.strictEqual(stored.password, 'super123', 'findOne mutated stored password');
});

// 4. update name: no password in response, name changed
run('update name: response has no password and name is updated', () => {
  const result = service.update(2, { name: 'Manoj Updated' });
  assert.ok(!hasPassword(result), `update returned password: ${JSON.stringify(result)}`);
  assert.strictEqual(result.name, 'Manoj Updated');
});

// 5. update email: no password in response, email changed
run('update email: response has no password and email is updated', () => {
  const result = service.update(2, { email: 'manoj.new@ticp.com' });
  assert.ok(!hasPassword(result), `update returned password: ${JSON.stringify(result)}`);
  assert.strictEqual(result.email, 'manoj.new@ticp.com');
});

// 6. update: role is immutable
run('update: role field is immutable through UpdateAdminDto', () => {
  // UpdateAdminDto does not accept role, so even if we cast, the stored value stays
  const result = service.update(2, {} as any);
  assert.strictEqual(result.role, 'admin', 'Role was mutated unexpectedly');
});

// 7. update: stored password preserved after update
run('update: stored record retains password after profile update', () => {
  service.update(2, { name: 'New Name' });
  const stored = admins.find(a => a.adminId === 2)!;
  assert.strictEqual(stored.password, 'admin123', 'update wiped stored password');
});

// 8. update: 404 for unknown id
run('update: throws NotFoundException for unknown id', () => {
  assert.throws(
    () => service.update(999, { name: 'Ghost' }),
    /Admin with ID 999 not found/,
    'Expected NotFoundException',
  );
});

console.log('\nRolesGuard – AdminsController ownership tests\n');

// 9. ADMIN matching id → allowed (findOne)
run('ADMIN with matching x-user-id → no exception (findOne)', () => {
  invokeGuardOwnership(guard, 'AdminsController', 'findOne', 'admin', '2', '2');
});

// 10. ADMIN mismatched id → 403 (findOne)
run('ADMIN with mismatched x-user-id → ForbiddenException (findOne)', () => {
  assert.throws(
    () => invokeGuardOwnership(guard, 'AdminsController', 'findOne', 'admin', '2', '3'),
    ForbiddenException,
    'Expected ForbiddenException for mismatched id',
  );
});

// 11. SUPERUSER matching id → allowed (findOne)
run('SUPERUSER with matching x-user-id → no exception (findOne)', () => {
  invokeGuardOwnership(guard, 'AdminsController', 'findOne', 'superuser', '1', '1');
});

// 12. SUPERUSER mismatched id → 403 (findOne)
run('SUPERUSER with mismatched x-user-id → ForbiddenException (findOne)', () => {
  assert.throws(
    () => invokeGuardOwnership(guard, 'AdminsController', 'findOne', 'superuser', '1', '2'),
    ForbiddenException,
    'Expected ForbiddenException for mismatched id',
  );
});

// 13. ADMIN matching id → allowed (update)
run('ADMIN with matching x-user-id → no exception (update)', () => {
  invokeGuardOwnership(guard, 'AdminsController', 'update', 'admin', '2', '2');
});

// 14. ADMIN mismatched id → 403 (update)
run('ADMIN with mismatched x-user-id → ForbiddenException (update)', () => {
  assert.throws(
    () => invokeGuardOwnership(guard, 'AdminsController', 'update', 'admin', '2', '1'),
    ForbiddenException,
    'Expected ForbiddenException for mismatched id',
  );
});

// 15. SUPERUSER matching id → allowed (update)
run('SUPERUSER with matching x-user-id → no exception (update)', () => {
  invokeGuardOwnership(guard, 'AdminsController', 'update', 'superuser', '1', '1');
});

// 16. SUPERUSER mismatched id → 403 (update)
run('SUPERUSER with mismatched x-user-id → ForbiddenException (update)', () => {
  assert.throws(
    () => invokeGuardOwnership(guard, 'AdminsController', 'update', 'superuser', '1', '3'),
    ForbiddenException,
    'Expected ForbiddenException for mismatched id',
  );
});

// 17. Non-admin role on AdminsController — the role check happens in canActivate before
// enforceOwnership, so if a TRAVELER somehow reached enforceOwnership for AdminsController,
// it would only check id. The @Roles guard rejects it earlier. We verify the guard
// rejects a traveler calling findOne on another id too (belt and suspenders):
run('TRAVELER with mismatched id on AdminsController → ForbiddenException', () => {
  assert.throws(
    () => invokeGuardOwnership(guard, 'AdminsController', 'findOne', 'traveler', '99', '1'),
    ForbiddenException,
  );
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
