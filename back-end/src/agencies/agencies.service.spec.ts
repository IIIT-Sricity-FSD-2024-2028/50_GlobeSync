/**
 * agencies.service.spec.ts
 *
 * Focused unit tests for AgenciesService password-exposure fix.
 * Run with: npx ts-node --project tsconfig.json src/agencies/agencies.service.spec.ts
 *
 * Verifies:
 *  1. findAll  — no response item contains a password property
 *  2. findOne  — no response contains a password property
 *  3. create   — registration response has no password; stored record retains it for login
 *  4. createDirect — admin-create response has no password; stored record retains it for login
 *  5. update   — profile-update response has no password; password change is stored for login
 *  6. updateStatus — status-change response has no password
 *  7. Agency login (via auth.service.ts) still works after a password update
 */

// Decorators are used at runtime but the classes still instantiate without the DI container.
// The reflect-metadata import satisfies emitDecoratorMetadata.
import 'reflect-metadata';
import * as assert from 'assert';

// ─── Seed isolation ──────────────────────────────────────────────────────────
// We import the mutable in-memory arrays directly so we can reset them between tests.
import { agencies } from '../data/agencies.data';

// Reset to a fixed seed before every test to avoid inter-test pollution.
function resetAgencies() {
  agencies.length = 0;
  agencies.push(
    {
      agencyId: 1,
      businessName: 'Horizon Travel Partners',
      contactEmail: 'ops@horizontravel.com',
      contactPhone: '9876543210',
      password: 'horizon123',
      status: 'approved',
      commissionRate: 1.5,
      createdAt: '2024-01-15T08:00:00Z',
    },
    {
      agencyId: 2,
      businessName: 'Wanderlust Resellers',
      contactEmail: 'bookings@wanderlust.in',
      contactPhone: '9123456780',
      password: 'wander123',
      status: 'approved',
      commissionRate: 1.2,
      createdAt: '2024-02-20T10:30:00Z',
    },
    {
      agencyId: 3,
      businessName: 'NextStop Adventures',
      contactEmail: 'hello@nextstop.travel',
      contactPhone: '9988776655',
      password: 'nextstop123',
      status: 'pending',
      createdAt: '2024-03-05T09:15:00Z',
    },
  );
}

// ─── Services under test ─────────────────────────────────────────────────────
import { AgenciesService } from './agencies.service';
import { AuthService } from '../auth/auth.service';

// ─── Helper ──────────────────────────────────────────────────────────────────
function hasPassword(obj: unknown): boolean {
  return obj !== null &&
    typeof obj === 'object' &&
    'password' in (obj as Record<string, unknown>);
}

// ─── Tests ───────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function run(name: string, fn: () => void) {
  resetAgencies();
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

const agenciesService = new AgenciesService();
const authService = new AuthService();

console.log('\nAgenciesService – password exposure tests\n');

// 1. findAll
run('findAll: no item in response contains password', () => {
  const all = agenciesService.findAll();
  assert.ok(all.length > 0, 'Expected at least one agency');
  for (const item of all) {
    assert.ok(!hasPassword(item), `findAll returned item with password: ${JSON.stringify(item)}`);
  }
});

run('findAll: in-memory record still retains password for auth', () => {
  agenciesService.findAll(); // side-effect-free; just confirm store untouched
  assert.ok(
    agencies.every(a => typeof a.password === 'string' && a.password.length > 0),
    'Some stored agency lost its password after findAll()',
  );
});

// 2. findOne
run('findOne: response does not contain password', () => {
  const result = agenciesService.findOne(1);
  assert.ok(!hasPassword(result), `findOne returned password: ${JSON.stringify(result)}`);
});

run('findOne: stored record retains password after findOne', () => {
  agenciesService.findOne(1);
  const stored = agencies.find(a => a.agencyId === 1)!;
  assert.strictEqual(stored.password, 'horizon123', 'findOne mutated the stored record password');
});

// 3. create (public registration)
run('create: registration response does not contain password', () => {
  const result = agenciesService.create({
    businessName: 'Test Agency',
    contactEmail: 'test@newagency.com',
    contactPhone: '9000000001',
    password: 'testpass123',
  });
  assert.ok(!hasPassword(result), `create returned password: ${JSON.stringify(result)}`);
});

run('create: stored record retains password so auth can log in', () => {
  agenciesService.create({
    businessName: 'Test Agency',
    contactEmail: 'test@newagency.com',
    contactPhone: '9000000001',
    password: 'testpass123',
  });
  const stored = agencies.find(a => a.contactEmail === 'test@newagency.com')!;
  assert.ok(stored, 'Stored record not found after create');
  assert.strictEqual(stored.password, 'testpass123', 'Stored record missing password after create');
});

// 4. createDirect (admin-created agency)
run('createDirect: response does not contain password', () => {
  const result = agenciesService.createDirect({
    businessName: 'Direct Agency',
    contactEmail: 'direct@newagency.com',
    contactPhone: '9000000002',
    password: 'directpass123',
    status: 'approved',
    commissionRate: 1.3,
  });
  assert.ok(!hasPassword(result), `createDirect returned password: ${JSON.stringify(result)}`);
});

run('createDirect: stored record retains password for login', () => {
  agenciesService.createDirect({
    businessName: 'Direct Agency',
    contactEmail: 'direct@newagency.com',
    contactPhone: '9000000002',
    password: 'directpass123',
    status: 'approved',
    commissionRate: 1.3,
  });
  const stored = agencies.find(a => a.contactEmail === 'direct@newagency.com')!;
  assert.ok(stored, 'Stored record not found after createDirect');
  assert.strictEqual(stored.password, 'directpass123', 'Stored record missing password after createDirect');
});

// 5. update (profile update)
run('update: response does not contain password', () => {
  const result = agenciesService.update(1, { businessName: 'New Name' });
  assert.ok(!hasPassword(result), `update returned password: ${JSON.stringify(result)}`);
});

run('update with password change: stored record gets new password for auth', () => {
  agenciesService.update(1, { password: 'newhorizon456' });
  const stored = agencies.find(a => a.agencyId === 1)!;
  assert.strictEqual(stored.password, 'newhorizon456', 'Password change was not persisted in stored record');
});

run('update with password change: response still has no password field', () => {
  const result = agenciesService.update(1, { password: 'newhorizon456' });
  assert.ok(!hasPassword(result), `update with password change returned password: ${JSON.stringify(result)}`);
});

// 6. updateStatus
run('updateStatus: response does not contain password', () => {
  const result = agenciesService.updateStatus(1, { status: 'rejected' });
  assert.ok(!hasPassword(result), `updateStatus returned password: ${JSON.stringify(result)}`);
});

run('updateStatus: stored record retains password after status change', () => {
  agenciesService.updateStatus(1, { status: 'approved', commissionRate: 1.4 });
  const stored = agencies.find(a => a.agencyId === 1)!;
  assert.strictEqual(stored.password, 'horizon123', 'Status change wiped the stored password');
});

// 7. Auth login still works (uses the stored record — password must still be there)
run('auth.agencyLogin: approved agency can still log in after sanitized findAll', () => {
  agenciesService.findAll(); // must not mutate stored records
  const result = authService.agencyLogin('ops@horizontravel.com', 'horizon123');
  assert.strictEqual(result.role, 'agency');
  assert.strictEqual(result.user.agencyId, 1);
  assert.ok(!hasPassword(result.user), 'agencyLogin response still exposes password');
});

run('auth.agencyLogin: login works after a password update via update()', () => {
  agenciesService.update(1, { password: 'newhorizon456' });
  const result = authService.agencyLogin('ops@horizontravel.com', 'newhorizon456');
  assert.strictEqual(result.role, 'agency');
  assert.strictEqual(result.user.agencyId, 1);
  assert.ok(!hasPassword(result.user), 'agencyLogin response still exposes password after update');
});

run('auth.agencyLogin: old password fails after password update', () => {
  agenciesService.update(1, { password: 'newhorizon456' });
  assert.throws(
    () => authService.agencyLogin('ops@horizontravel.com', 'horizon123'),
    /Invalid email or password/,
    'Old password should be rejected after update',
  );
});

run('auth.agencyLogin: pending agency cannot log in', () => {
  assert.throws(
    () => authService.agencyLogin('hello@nextstop.travel', 'nextstop123'),
    /Agency account is pending/,
    'Pending agency should not be allowed to log in',
  );
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
