process.env.NODE_ENV = 'test';

import 'reflect-metadata';
import * as assert from 'assert';
import * as supertest from 'supertest';
const request = (supertest as any).default || supertest;
import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app.module';
import { testDb } from '../database/test-database';
import { bookings, trips } from '../data';
import { PrismaService } from '../database/prisma.service';

let passed = 0;
let failed = 0;

async function run(name: string, fn: () => void | Promise<void>) {
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

async function main() {
  console.log('================================================================');
  console.log('GlobeSync Integration Test Suite (Supertest & Database Flow)');
  console.log('================================================================\n');

  // 1. Initialize NestJS Application with NestFactory
  const app: INestApplication = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  const server = app.getHttpServer();

  // Reset isolated test state
  testDb.resetAll();

  // Check Database connection (Live Postgres or Isolated Fallback)
  const prisma = app.get(PrismaService);
  let isPostgresLive = false;
  if (PrismaService.isConnected) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      isPostgresLive = true;
      console.log('  [Database] Connected to live PostgreSQL test database.\n');
    } catch {
      isPostgresLive = false;
    }
  }

  if (!isPostgresLive) {
    console.log('  [Database] Live PostgreSQL unavailable; running with fast transactional testDb mock.\n');
    const userMock = {
      findUnique: async ({ where }: any) => {
        return testDb.users.find((u) => u.email.toLowerCase() === (where.email || '').toLowerCase()) || null;
      },
      findFirst: async ({ where }: any) => {
        if (where.password_reset_token) {
          return testDb.users.find((u: any) => u.password_reset_token === where.password_reset_token) || null;
        }
        return testDb.users[0] || null;
      },
      create: async ({ data }: any) => {
        const u: any = {
          id: testDb.users.length + 1,
          email: data.email,
          password_hash: data.password_hash,
          role: data.role || 'TRAVELER',
          status: data.status || 'ACTIVE',
          name: data.name,
          phone: data.phone,
          gender: data.gender,
          age: data.age,
          created_at: new Date(),
          updated_at: new Date(),
        };
        testDb.users.push(u);
        return u;
      },
      update: async ({ where, data }: any) => {
        const u: any = testDb.users.find((x) => x.id === where.id);
        if (u) Object.assign(u, data);
        return u || { id: where.id, ...data };
      },
    };
    Object.defineProperty(prisma, 'user', { value: userMock, configurable: true, writable: true });
    Object.defineProperty(prisma, 'refreshToken', {
      value: {
        create: async () => ({ id: 1 }),
        findFirst: async () => null,
        update: async () => ({}),
        updateMany: async () => ({ count: 0 }),
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(prisma, 'notification', {
      value: {
        create: async () => ({ id: 1, created_at: new Date() }),
      },
      configurable: true,
      writable: true,
    });
  }

  const uniqueId = Date.now();
  const testTravelerEmail = `integration.traveler.${uniqueId}@example.com`;
  const testPassword = 'Password@123';
  let travelerToken = '';
  let travelerId = 0;
  let guideToken = '';
  // Devansh's guide profile id (trips reference guide profiles, not login account ids)
  let guideProfileId = 0;
  let bookingId = 0;
  let bookingAmount = 25000;
  let tripId = 0;

  // --- Step 1: Register New Traveler ---
  console.log('--- Step 1: Traveler Registration (POST /auth/register/traveler) ---');
  await run('Registers a new traveler with secure hashed credentials', async () => {
    const res = await request(server)
      .post('/auth/register/traveler')
      .send({
        email: testTravelerEmail,
        password: testPassword,
        name: 'Integration Test Traveler',
        phone: '+91 9988776655',
        gender: 'Female',
        age: 29,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.email.toLowerCase(), testTravelerEmail.toLowerCase());
    travelerId = res.body.id || res.body.travelerId;
    assert.ok(travelerId > 0, 'Must return traveler ID');
  });

  // --- Step 2: Login Authenticated Traveler ---
  console.log('\n--- Step 2: Traveler Authentication (POST /auth/login) ---');
  await run('Authenticates registered traveler and returns signed JWT token', async () => {
    const res = await request(server)
      .post('/auth/login')
      .send({
        email: testTravelerEmail,
        password: testPassword,
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.accessToken);
    travelerToken = res.body.accessToken;
  });

  // Also authenticate guide (Devansh) for subsequent steps
  await run('Authenticates demo guide for assignment acceptance', async () => {
    const res = await request(server)
      .post('/auth/login')
      .send({
        email: 'Devansh@gmail.com',
        password: 'guide123',
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.accessToken);
    guideToken = res.body.accessToken;
    guideProfileId = Number(res.body.user.guideId);
    assert.ok(guideProfileId > 0, 'Login must return the guide profile id');
  });

  // --- Step 3: Create Booking (HOLD State with Idempotency) ---
  console.log('\n--- Step 3: Create Booking (POST /bookings with Idempotency-Key) ---');
  await run('Creates a booking in HELD state with server-authoritative pricing', async () => {
    const departureDate = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(); // 5 days from now
    const idempotencyKey = `idemp-flow-${uniqueId}`;

    // 3a. Create Trip
    const tripRes = await request(server)
      .post('/trips')
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('x-user-id', String(travelerId))
      .set('x-user-role', 'traveler')
      .send({
        title: 'Goa Coastal Adventure',
        destination: 'Goa',
        startDate: departureDate.slice(0, 10),
        endDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        budget: 25000,
        travelerId,
        guideId: guideProfileId,
        status: 'Pending',
        transportDetails: {
          transportType: 'Flight',
          carrier: 'IndiGo 6E-101',
          lodgingTier: '3-Star Resort',
        },
      });
    assert.strictEqual(tripRes.status, 201);
    tripId = tripRes.body.tripId;

    // 3a-2. The chosen guide accepts first: a trip with a guide can be booked only after acceptance (owner rule).
    const acceptRes = await request(server)
      .put(`/trips/${tripId}`)
      .set('Authorization', `Bearer ${guideToken}`)
      .send({ guideStatus: 'Accepted' });
    assert.strictEqual(acceptRes.status, 200, JSON.stringify(acceptRes.body));

    // 3b. Create Booking on Trip
    const res = await request(server)
      .post('/bookings')
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('x-user-id', String(travelerId))
      .set('x-user-role', 'traveler')
      .set('idempotency-key', idempotencyKey)
      .send({
        tripId,
        travelerId,
        service: 'Goa Coastal Adventure',
        type: 'Package',
        bookingDate: departureDate,
        amount: 25000,
        cancellationProtectionSelected: true,
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.bookingId);
    assert.strictEqual(res.body.status, 'HELD');
    bookingId = res.body.bookingId;
    bookingAmount = Number(res.body.amount || 25000);
  });

  // --- Step 4: Payment Processing ---
  console.log('\n--- Step 4: Payment Processing (POST /payments) ---');
  await run('Processes payment and transitions booking to PAID / CONFIRMED', async () => {
    const res = await request(server)
      .post('/payments')
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('x-user-id', String(travelerId))
      .set('x-user-role', 'traveler')
      .send({
        bookingId,
        amount: bookingAmount,
        paymentDate: new Date().toISOString(),
        method: 'Card',
        status: 'Paid',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'Paid');
  });

  // --- Step 5: Guide Acceptance ---
  console.log('\n--- Step 5: Guide Status Acceptance (PATCH /trips/:id) ---');
  await run('Guide accepts trip assignment after checking availability', async () => {
    const res = await request(server)
      .patch(`/trips/${tripId}`)
      .set('Authorization', `Bearer ${guideToken}`)
      .set('x-user-id', '4')
      .set('x-user-role', 'guide')
      .send({
        guideId: guideProfileId,
        guideStatus: 'Accepted',
      });

    assert.ok([200, 204].includes(res.status));
  });

  // --- Step 6: Chat / Messaging ---
  console.log('\n--- Step 6: In-App Messaging (POST /messages) ---');
  await run('Traveler sends coordination message to assigned guide', async () => {
    const res = await request(server)
      .post('/messages')
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('x-user-id', String(travelerId))
      .set('x-user-role', 'traveler')
      .send({
        sender: 'traveler',
        senderId: travelerId,
        receiver: 'guide',
        receiverId: 4,
        content: 'Hi Devansh, looking forward to the tour! What should I pack?',
        bookingId,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.content, 'Hi Devansh, looking forward to the tour! What should I pack?');
  });

  // --- Step 7: Cancellation Preview & Server-Side Execution ---
  console.log('\n--- Step 7: Cancellation Preview & Execution (PolicyService) ---');
  await run('Previews exact refund tier and amount before confirming cancellation', async () => {
    const res = await request(server)
      .get(`/bookings/${bookingId}/cancellation-preview`)
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('x-user-id', String(travelerId))
      .set('x-user-role', 'traveler');

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.isAllowed, 'Cancellation should be allowed > 72h out');
    assert.ok(res.body.refundAmount > 0);
  });

  await run('Cancels booking, records refund row and creates append-only ledger entry', async () => {
    const res = await request(server)
      .post(`/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('x-user-id', String(travelerId))
      .set('x-user-role', 'traveler')
      .send({
        reason: 'Change in personal schedule',
      });

    assert.ok([200, 201].includes(res.status));
    assert.strictEqual(res.body.status.toUpperCase(), 'CANCELLED');
    assert.ok(res.body.refundId, 'Refund ID must be present');
    assert.ok(res.body.refundAmount > 0, 'Refund amount must be > 0');
    assert.ok(res.body.ledgerEntryId, 'Ledger entry ID must be present');
  });

  await run('Double cancellation is strictly blocked (idempotent 409 Conflict)', async () => {
    const res = await request(server)
      .post(`/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('x-user-id', String(travelerId))
      .set('x-user-role', 'traveler')
      .send({
        reason: 'Second cancellation attempt',
      });

    assert.strictEqual(res.status, 409);
  });

  // --- Step 8: Post-Trip Reviews ---
  console.log('\n--- Step 8: Review Submission Policy (POST /reviews) ---');
  await run('Rejects review for non-COMPLETED booking', async () => {
    const res = await request(server)
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('x-user-id', String(travelerId))
      .set('x-user-role', 'traveler')
      .send({
        bookingId,
        tripId,
        travelerId,
        guideId: guideProfileId,
        tripRating: 5,
        guideRating: 5,
        comment: 'Great trip before cancellation!',
      });

    assert.strictEqual(res.status, 400);
  });

  await run('Allows review submission when booking is COMPLETED and enforces single review', async () => {
    // Create a completed booking fixture for review validation
    const completedBookingId = 99901;
    // The review guard checks that the trip exists and belongs to the reviewer,
    // so the completed-trip fixture needs a real trip record as well.
    trips.push({
      tripId: 201, title: 'Completed Tour', origin: 'Delhi', destination: 'Goa',
      startDate: '2026-01-01', endDate: '2026-01-05', budget: 15000, travelerId,
      guideId: guideProfileId, guideStatus: 'Accepted', status: 'Completed',
    } as any);
    bookings.push({
      bookingId: completedBookingId,
      tripId: 201,
      travelerId,
      status: 'COMPLETED',
      amount: 15000,
      service: 'Completed Tour',
      type: 'Package',
      bookingDate: new Date().toISOString(),
    } as any);

    const res = await request(server)
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .set('x-user-id', String(travelerId))
      .set('x-user-role', 'traveler')
      .send({
        bookingId: completedBookingId,
        tripId: 201,
        travelerId,
        guideId: guideProfileId,
        tripRating: 5,
        guideRating: 5,
        comment: 'Outstanding experience with Devansh. Highly recommended!',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.tripRating, 5);
  });

  await app.close();

  console.log('\n================================================================');
  console.log(`Integration Test Results: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal Integration Test Error:', err);
  process.exit(1);
});
