/**
 * revenue-subscriptions-promotions.rbac.spec.ts
 *
 * Focused RBAC and ownership tests for RevenueController,
 * SubscriptionsController, and PromotionsController.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json src/revenue/revenue-subscriptions-promotions.rbac.spec.ts
 *
 * Tests are purely at the guard layer (enforceOwnership) and the
 * role-check layer (canActivate). We mock the ExecutionContext so no
 * HTTP server is needed.
 *
 * Coverage:
 *  RevenueController:
 *   1.  AGENCY with matching id → allowed (getAgencyRevenue)
 *   2.  AGENCY with mismatched id → 403 (getAgencyRevenue)
 *   3.  ADMIN accesses any agency revenue → allowed (bypasses ownership)
 *   4.  SUPERUSER accesses any agency revenue → allowed
 *   5.  No role header → 403 (canActivate rejects)
 *   6.  TRAVELER on admin/revenue/overview → 403
 *   7.  ADMIN on admin/revenue/overview → allowed
 *   8.  SUPERUSER on admin/revenue/config/:key (updateConfig) → allowed
 *   9.  ADMIN on admin/revenue/config/:key → 403 (SUPERUSER-only)
 *
 *  SubscriptionsController:
 *  10.  AGENCY with matching :id → allowed (getAgencySubscription)
 *  11.  AGENCY with mismatched :id → 403 (getAgencySubscription)
 *  12.  AGENCY with matching body.agencyId → allowed (subscribe)
 *  13.  AGENCY with mismatched body.agencyId → 403 (subscribe)
 *  14.  ADMIN on getAgencySubscription → allowed (bypasses ownership)
 *  15.  SUPERUSER on subscribe → allowed (bypasses ownership)
 *  16.  TRAVELER on getPlans → allowed (all authenticated roles)
 *  17.  GUIDE on getPlans → allowed
 *
 *  PromotionsController:
 *  18.  AGENCY with matching body.agencyId → allowed (createPromotion)
 *  19.  AGENCY with mismatched body.agencyId → 403 (createPromotion)
 *  20.  ADMIN on createPromotion → allowed (bypasses ownership)
 *  21.  SUPERUSER on createPromotion → allowed
 *  22.  TRAVELER on getAllPromotions → allowed (all authenticated roles)
 *  23.  SUPPORT on getAllPromotions → allowed
 */

import 'reflect-metadata';
import * as assert from 'assert';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../common/guards/roles.guard';

// ─── Test plumbing ───────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function run(name: string, fn: () => void) {
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

/**
 * Build a mock ExecutionContext suitable for canActivate.
 * requiredRoles is what @Roles() would produce from the reflector.
 */
function mockCanActivateCtx(
  controllerName: string,
  handlerName: string,
  role: string | undefined,
  userId: string,
  params: Record<string, string> = {},
  body: Record<string, unknown> = {},
  requiredRoles: string[],
) {
  const ctx = {
    getClass:   () => ({ name: controllerName }),
    getHandler: () => ({ name: handlerName }),
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {
          ...(role ? { 'x-user-role': role } : {}),
          'x-user-id': userId,
        },
        params,
        body,
      }),
    }),
  } as any;

  // Stub the reflector inside the guard instance
  (guard as any).reflector = {
    getAllAndOverride: (_key: string, _targets: any[]) => requiredRoles,
  };

  return ctx;
}

function canActivate(
  controllerName: string,
  handlerName: string,
  role: string | undefined,
  userId: string,
  requiredRoles: string[],
  params: Record<string, string> = {},
  body: Record<string, unknown> = {},
): boolean {
  const ctx = mockCanActivateCtx(controllerName, handlerName, role, userId, params, body, requiredRoles);
  return guard.canActivate(ctx);
}

// ─────────────────────────────────────────────────────────────────────────────
// RevenueController
// ─────────────────────────────────────────────────────────────────────────────
const REV_AGENCY_ROLES = ['agency', 'admin', 'superuser'];
const REV_ADMIN_ROLES  = ['admin', 'superuser'];
const REV_SUPER_ROLES  = ['superuser'];

console.log('\nRevenueController – RBAC + ownership\n');

run('1. AGENCY matching id → allowed (getAgencyRevenue)', () => {
  const ok = canActivate('RevenueController', 'getAgencyRevenue', 'agency', '1', REV_AGENCY_ROLES, { id: '1' });
  assert.strictEqual(ok, true);
});

run('2. AGENCY mismatched id → 403 (getAgencyRevenue)', () => {
  assert.throws(
    () => canActivate('RevenueController', 'getAgencyRevenue', 'agency', '1', REV_AGENCY_ROLES, { id: '2' }),
    ForbiddenException,
  );
});

run('3. ADMIN accesses any agency revenue → allowed', () => {
  const ok = canActivate('RevenueController', 'getAgencyRevenue', 'admin', '1', REV_AGENCY_ROLES, { id: '99' });
  assert.strictEqual(ok, true);
});

run('4. SUPERUSER accesses any agency revenue → allowed', () => {
  const ok = canActivate('RevenueController', 'getAgencyRevenue', 'superuser', '1', REV_AGENCY_ROLES, { id: '99' });
  assert.strictEqual(ok, true);
});

run('5. No role header → 403 (canActivate rejects missing header)', () => {
  assert.throws(
    () => canActivate('RevenueController', 'getAdminOverview', undefined, '1', REV_ADMIN_ROLES),
    ForbiddenException,
  );
});

run('6. TRAVELER on getAdminOverview → 403 (role not in list)', () => {
  assert.throws(
    () => canActivate('RevenueController', 'getAdminOverview', 'traveler', '1', REV_ADMIN_ROLES),
    ForbiddenException,
  );
});

run('7. ADMIN on getAdminOverview → allowed', () => {
  const ok = canActivate('RevenueController', 'getAdminOverview', 'admin', '1', REV_ADMIN_ROLES);
  assert.strictEqual(ok, true);
});

run('8. SUPERUSER on updateConfig (SUPERUSER-only) → allowed', () => {
  const ok = canActivate('RevenueController', 'updateConfig', 'superuser', '1', REV_SUPER_ROLES, { key: 'AGENCY_COMMISSION_RATE' });
  assert.strictEqual(ok, true);
});

run('9. ADMIN on updateConfig (SUPERUSER-only) → 403', () => {
  assert.throws(
    () => canActivate('RevenueController', 'updateConfig', 'admin', '1', REV_SUPER_ROLES, { key: 'AGENCY_COMMISSION_RATE' }),
    ForbiddenException,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SubscriptionsController
// ─────────────────────────────────────────────────────────────────────────────
const SUB_AGENCY_ROLES = ['agency', 'admin', 'superuser'];
const SUB_ALL_ROLES    = ['traveler', 'guide', 'agency', 'admin', 'superuser', 'support'];

console.log('\nSubscriptionsController – RBAC + ownership\n');

run('10. AGENCY matching :id → allowed (getAgencySubscription)', () => {
  const ok = canActivate('SubscriptionsController', 'getAgencySubscription', 'agency', '2', SUB_AGENCY_ROLES, { id: '2' });
  assert.strictEqual(ok, true);
});

run('11. AGENCY mismatched :id → 403 (getAgencySubscription)', () => {
  assert.throws(
    () => canActivate('SubscriptionsController', 'getAgencySubscription', 'agency', '2', SUB_AGENCY_ROLES, { id: '1' }),
    ForbiddenException,
  );
});

run('12. AGENCY matching body.agencyId → allowed (subscribe)', () => {
  const ok = canActivate('SubscriptionsController', 'subscribe', 'agency', '1', SUB_AGENCY_ROLES, {}, { agencyId: 1, planId: 1, paymentRef: 'REF001' });
  assert.strictEqual(ok, true);
});

run('13. AGENCY mismatched body.agencyId → 403 (subscribe)', () => {
  assert.throws(
    () => canActivate('SubscriptionsController', 'subscribe', 'agency', '1', SUB_AGENCY_ROLES, {}, { agencyId: 2, planId: 1, paymentRef: 'REF001' }),
    ForbiddenException,
  );
});

run('14. ADMIN on getAgencySubscription → allowed (bypasses ownership)', () => {
  const ok = canActivate('SubscriptionsController', 'getAgencySubscription', 'admin', '1', SUB_AGENCY_ROLES, { id: '99' });
  assert.strictEqual(ok, true);
});

run('15. SUPERUSER on subscribe → allowed (bypasses ownership)', () => {
  const ok = canActivate('SubscriptionsController', 'subscribe', 'superuser', '1', SUB_AGENCY_ROLES, {}, { agencyId: 99, planId: 1, paymentRef: 'REF002' });
  assert.strictEqual(ok, true);
});

run('16. TRAVELER on getPlans → allowed (all authenticated)', () => {
  const ok = canActivate('SubscriptionsController', 'getPlans', 'traveler', '5', SUB_ALL_ROLES);
  assert.strictEqual(ok, true);
});

run('17. GUIDE on getPlans → allowed', () => {
  const ok = canActivate('SubscriptionsController', 'getPlans', 'guide', '3', SUB_ALL_ROLES);
  assert.strictEqual(ok, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// PromotionsController
// ─────────────────────────────────────────────────────────────────────────────
const PROM_AGENCY_ROLES = ['agency', 'admin', 'superuser'];
const PROM_ALL_ROLES    = ['traveler', 'guide', 'agency', 'admin', 'superuser', 'support'];

console.log('\nPromotionsController – RBAC + ownership\n');

run('18. AGENCY matching body.agencyId → allowed (createPromotion)', () => {
  const ok = canActivate('PromotionsController', 'createPromotion', 'agency', '1', PROM_AGENCY_ROLES, {}, { agencyId: 1, packageId: 2, type: 'HOMEPAGE', price: 500, paymentRef: 'PAY001' });
  assert.strictEqual(ok, true);
});

run('19. AGENCY mismatched body.agencyId → 403 (createPromotion)', () => {
  assert.throws(
    () => canActivate('PromotionsController', 'createPromotion', 'agency', '1', PROM_AGENCY_ROLES, {}, { agencyId: 2, packageId: 2, type: 'HOMEPAGE', price: 500, paymentRef: 'PAY001' }),
    ForbiddenException,
  );
});

run('20. ADMIN on createPromotion → allowed (bypasses ownership)', () => {
  const ok = canActivate('PromotionsController', 'createPromotion', 'admin', '1', PROM_AGENCY_ROLES, {}, { agencyId: 99, packageId: 2, type: 'SEARCH_RESULT', price: 200, paymentRef: 'PAY002' });
  assert.strictEqual(ok, true);
});

run('21. SUPERUSER on createPromotion → allowed', () => {
  const ok = canActivate('PromotionsController', 'createPromotion', 'superuser', '1', PROM_AGENCY_ROLES, {}, { agencyId: 99, packageId: 2, type: 'HOMEPAGE', price: 200, paymentRef: 'PAY003' });
  assert.strictEqual(ok, true);
});

run('22. TRAVELER on getAllPromotions → allowed (all authenticated)', () => {
  const ok = canActivate('PromotionsController', 'getAllPromotions', 'traveler', '5', PROM_ALL_ROLES);
  assert.strictEqual(ok, true);
});

run('23. SUPPORT on getAllPromotions → allowed', () => {
  const ok = canActivate('PromotionsController', 'getAllPromotions', 'support', '1', PROM_ALL_ROLES);
  assert.strictEqual(ok, true);
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
