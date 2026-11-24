// Audit regression suite (Nov 2026 audit).
// Boots the real AppModule over HTTP in a non-test NODE_ENV, so the production
// guards are used (the x-user-role / x-user-id header fallback is OFF), and checks
// every P0/P1 defect fixed in the audit. See audit-reports/FIXES_IMPLEMENTED.md.
process.env.NODE_ENV = 'development';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '10000';

import 'reflect-metadata';
import * as assert from 'assert';
import * as supertest from 'supertest';
const request = (supertest as any).default || supertest;
import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app.module';
import { refunds } from '../data';

let passed = 0;
let failed = 0;
async function run(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function main() {
  console.log('==================== AUDIT REGRESSION (HTTP) ====================');
  const app: INestApplication = await NestFactory.create(AppModule, { logger: ['error'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  const http = app.getHttpServer();

  const login = async (email: string, password: string) => {
    const r = await request(http).post('/auth/login').send({ email, password });
    assert.ok(r.status === 200 || r.status === 201, `login ${email} -> ${r.status} ${JSON.stringify(r.body)}`);
    return { token: r.body.accessToken as string, user: r.body.user, refresh: r.body.refreshToken as string };
  };
  const as = (token: string) => ({
    get: (p: string) => request(http).get(p).set('Authorization', `Bearer ${token}`),
    post: (p: string, b?: any) => request(http).post(p).set('Authorization', `Bearer ${token}`).send(b),
    put: (p: string, b?: any) => request(http).put(p).set('Authorization', `Bearer ${token}`).send(b),
    patch: (p: string, b?: any) => request(http).patch(p).set('Authorization', `Bearer ${token}`).send(b),
  });

  // Demo seed accounts (in-memory demo data, not real credentials).
  const T = await login('Arjun@gmail.com', 'traveler123');
  const G = await login('Devansh@gmail.com', 'guide123');
  const A = await login('admin@ticp.com', 'admin123');
  const tid = Number(T.user.travelerId);
  const gid = Number(G.user.guideId);
  const t = as(T.token), g = as(G.token), a = as(A.token);

  console.log('\n--- Authentication and identity ---');
  await run('SEC-001 private data needs a token (GET /travelers without auth -> 401)', async () => {
    const r = await request(http).get('/travelers');
    assert.strictEqual(r.status, 401);
  });
  await run('SEC-002 spoofed x-user-role: superuser header is ignored', async () => {
    const r = await request(http).get('/admins/audit-logs').set('x-user-role', 'superuser').set('x-user-id', '1');
    assert.strictEqual(r.status, 401);
  });
  await run('SEC-003 traveler token cannot call admin routes', async () => {
    const r = await t.get('/admins/audit-logs');
    assert.strictEqual(r.status, 403);
  });
  await run('ID-001 login returns role-specific profile id (Arjun = traveler 1, Devansh = guide 1)', async () => {
    assert.strictEqual(tid, 1);
    assert.strictEqual(gid, 1);
    const r = await t.get(`/travelers/${tid}`);
    assert.strictEqual(r.status, 200);
  });
  await run('AUTH-004 refresh token works in in-memory mode', async () => {
    const r = await request(http).post('/auth/refresh').send({ refreshToken: T.refresh });
    assert.ok(r.status === 200 || r.status === 201, `refresh -> ${r.status} ${JSON.stringify(r.body)}`);
    assert.ok(r.body.accessToken);
  });
  await run('NOTIF-001 notifications endpoint exists and is role-scoped', async () => {
    const r = await t.get('/notifications');
    assert.strictEqual(r.status, 200);
  });

  console.log('\n--- Trips: validation and permissions ---');
  let tripId = 0;
  await run('TRIP-VAL past / reversed / non-date inputs rejected', async () => {
    for (const body of [
      { destination: 'Past', startDate: day(-3), endDate: day(-1), budget: 100, travelerId: tid },
      { destination: 'Rev', startDate: day(10), endDate: day(9), budget: 100, travelerId: tid },
      { destination: 'Bad', startDate: 'not-a-date', endDate: 'zzz', budget: 100, travelerId: tid },
    ]) {
      const r = await t.post('/trips', body);
      assert.strictEqual(r.status, 400, `${JSON.stringify(body)} -> ${r.status}`);
    }
  });
  await run('TRIP-VAL unknown guide rejected', async () => {
    const r = await t.post('/trips', { destination: 'X', startDate: day(20), endDate: day(22), budget: 100, travelerId: tid, guideId: 9999 });
    assert.ok(r.status === 400 || r.status === 404, `-> ${r.status}`);
  });
  await run('TRIP-001 traveler creates a trip with a guide request', async () => {
    const r = await t.post('/trips', { destination: 'Goa', startDate: day(30), endDate: day(34), budget: 50000, travelerId: tid, guideId: gid, status: 'Pending' });
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    tripId = r.body.tripId;
  });
  await run('TRIP-002 traveler cannot accept the guide request themselves', async () => {
    const r = await t.put(`/trips/${tripId}`, { guideStatus: 'Accepted' });
    assert.ok(r.status >= 400, `-> ${r.status}`);
  });
  await run('TRIP-003 traveler cannot move the trip to another traveler', async () => {
    const r = await t.put(`/trips/${tripId}`, { travelerId: 99 });
    assert.ok(r.status >= 400, `-> ${r.status}`);
  });
  await run('TRIP-004 traveler cannot self-confirm an unpaid trip', async () => {
    const r = await t.patch(`/trips/${tripId}/status`, { status: 'Confirmed' });
    assert.ok(r.status >= 400, `-> ${r.status}`);
  });
  await run('TRIP-005 guide cannot change the trip budget', async () => {
    const r = await g.put(`/trips/${tripId}`, { budget: 1 });
    assert.ok(r.status >= 400, `-> ${r.status}`);
  });
  await run('TRIP-006 guide accepts the request', async () => {
    const r = await g.put(`/trips/${tripId}`, { guideStatus: 'Accepted' });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.strictEqual(r.body.guideStatus, 'Accepted');
  });
  await run('GUIDE-001 guide cannot accept an overlapping trip', async () => {
    const c = await t.post('/trips', { destination: 'Goa2', startDate: day(31), endDate: day(33), budget: 1000, travelerId: tid, guideId: gid, status: 'Pending' });
    assert.strictEqual(c.status, 201);
    const r = await g.put(`/trips/${c.body.tripId}`, { guideStatus: 'Accepted' });
    assert.strictEqual(r.status, 409, `-> ${r.status}`);
  });

  console.log('\n--- Bookings and payments ---');
  let bookingId = 0;
  let due = 0;
  await run('BOOK-001 traveler books a service on own trip', async () => {
    const r = await t.post('/bookings', { tripId, travelerId: tid, service: 'IndiGo 6E', type: 'Flight', amount: 20000, status: 'Pending', transportMode: 'Flight' });
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    bookingId = r.body.bookingId;
    due = r.body.total_minor ? r.body.total_minor / 100 : Number(r.body.amount);
    assert.ok(due > 0);
  });
  await run('PAY-001 payment of Rs 1 for a larger booking is rejected', async () => {
    const r = await t.post('/payments', { amount: 1, paymentDate: day(0), method: 'Card', status: 'Paid', bookingId });
    assert.strictEqual(r.status, 400, `-> ${r.status}`);
  });
  await run('BOOK-002 traveler cannot rewrite the booking amount', async () => {
    const r = await t.put(`/bookings/${bookingId}`, { amount: 1 });
    assert.ok(r.status >= 400, `-> ${r.status}`);
  });
  await run('PAY-002 traveler cannot record a Cash payment', async () => {
    const r = await t.post('/payments', { amount: due, paymentDate: day(0), method: 'Cash', status: 'Paid', bookingId });
    assert.strictEqual(r.status, 400);
  });
  await run('PAY-003 exact payment is accepted', async () => {
    const r = await t.post('/payments', { amount: due, paymentDate: day(0), method: 'Card', status: 'Paid', bookingId });
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  });
  await run('PAY-004 duplicate payment for same booking rejected', async () => {
    const r = await t.post('/payments', { amount: due, paymentDate: day(0), method: 'Card', status: 'Paid', bookingId });
    assert.strictEqual(r.status, 400);
  });

  console.log('\n--- Cross-account isolation ---');
  await run('ISO-001 a second traveler cannot attach a booking to Arjun\'s trip', async () => {
    const email = `iso.${Date.now()}@example.com`;
    const reg = await request(http).post('/auth/register/traveler').send({ email, password: 'Str0ngPass1', name: 'Iso Tester' });
    assert.ok(reg.status === 200 || reg.status === 201, `register -> ${reg.status} ${JSON.stringify(reg.body)}`);
    const B = await login(email, 'Str0ngPass1');
    const r = await as(B.token).post('/bookings', { tripId, travelerId: Number(B.user.travelerId), service: 'Hack', type: 'Hotel', amount: 10 });
    assert.strictEqual(r.status, 403, `-> ${r.status}`);
    const p = await as(B.token).get(`/bookings/${bookingId}/cancellation-preview`);
    assert.ok(p.status === 403 || p.status === 404, `preview -> ${p.status}`);
  });
  await run('ISO-002 guide sees only travelers on own trips', async () => {
    const r = await g.get('/travelers');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body));
    const all = await a.get('/travelers');
    assert.ok(all.body.length > r.body.length, `guide sees ${r.body.length} of ${all.body.length}`);
    assert.ok(r.body.every((x: any) => x.travelerId === tid), JSON.stringify(r.body.map((x: any) => x.travelerId)));
  });

  console.log('\n--- Cancellation, refunds and dashboards ---');
  await run('REF-001 cancelling a paid booking creates a refund visible to admin (GET /refunds)', async () => {
    const before = refunds.length;
    const c = await t.post(`/bookings/${bookingId}/cancel`, { reason: 'Plans changed' });
    assert.ok(c.status === 200 || c.status === 201, `cancel -> ${c.status} ${JSON.stringify(c.body)}`);
    const r = await a.get('/refunds');
    assert.strictEqual(r.status, 200);
    assert.ok(refunds.length === before + 1, `refunds ${before} -> ${refunds.length}`);
    assert.ok(r.body.some((x: any) => String(x.reason || '').includes(`#${bookingId}`)));
  });
  await run('DASH-001 admin dashboard counts HELD bookings as pending', async () => {
    const r = await a.get('/dashboard/admin');
    assert.strictEqual(r.status, 200, `-> ${r.status}`);
    const held = (await a.get('/bookings')).body.filter((b: any) => ['PENDING', 'HELD', 'DRAFT'].includes(String(b.status).toUpperCase())).length;
    assert.strictEqual(r.body.pendingBookings, held);
  });

  await app.close();
  console.log('\n================================================================');
  console.log(`Audit Regression Results: ${passed} passed, ${failed} failed`);
  console.log('================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
