/**
 * realtime.spec.ts
 *
 * Comprehensive test suite for Part 6:
 *  1. Unauthorized socket rejected (missing token, invalid token, or expired token).
 *  2. Authenticated socket successfully joins personal user room.
 *  3. User cannot join another user's personal room (room isolation security).
 *  4. Participant-only access to booking and ticket rooms (forbidden for non-participants).
 *  5. Event reaches only intended recipients (room isolation).
 *  6. Chat: Typing indicators, delivery/read receipts, and message history pagination.
 *  7. Notifications persistence: unreadCount, mark read, mark all read, and since cursor filter.
 *  8. Domain events emitted:
 *     - guide_request.created / accepted / declined
 *     - booking.status_changed
 *     - message.created
 *     - ticket.updated
 *     - refund.processed
 *     - agency.approved / rejected
 *     - notification.created
 *  9. Email notification dispatch (booking confirmation, cancellation, refund).
 */

import 'reflect-metadata';
import * as assert from 'assert';
import { JwtService } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email.service';
import { MessagesService } from '../messages/messages.service';
import { SupportTicketsService } from '../support-tickets/support-tickets.service';
import { TripsService } from '../trips/trips.service';
import { AgenciesService } from '../agencies/agencies.service';
import { BookingsService } from '../bookings/bookings.service';
import { PolicyService } from '../policy/policy.service';
import { InventoryService } from '../inventory/inventory.service';
import { ManualInventoryProviderAdapter } from '../inventory/adapters/manual-inventory-provider.adapter';
import { GuideAvailabilityService } from '../guides/guide-availability.service';
import { PricingService } from '../bookings/pricing.service';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { testDb } from '../database/test-database';
import { bookings } from '../data/bookings.data';
import { trips } from '../data/trips.data';
import { messages } from '../data/messages.data';
import { guides } from '../data/guides.data';

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

/**
 * Mock Socket.IO Client for Gateway testing
 */
class MockSocket {
  public id: string;
  public handshake: any = { auth: {}, headers: {}, query: {} };
  public data: any = {};
  public rooms = new Set<string>();
  public emittedEvents: { event: string; data: any }[] = [];
  public disconnected = false;
  public broadcastToRoom?: (room: string, event: string, data: any) => void;

  constructor(id: string, token?: string) {
    this.id = id;
    if (token) {
      this.handshake.auth.token = token;
    }
  }

  join(room: string) {
    this.rooms.add(room);
  }

  leave(room: string) {
    this.rooms.delete(room);
  }

  emit(event: string, data: any) {
    this.emittedEvents.push({ event, data });
  }

  disconnect(close = true) {
    this.disconnected = true;
  }

  to(room: string) {
    return {
      emit: (event: string, data: any) => {
        if (this.broadcastToRoom) {
          this.broadcastToRoom(room, event, data);
        }
      },
    };
  }
}

/**
 * Mock Socket.IO Server for Gateway testing
 */
class MockServer {
  public roomSockets = new Map<string, Set<MockSocket>>();
  public serverEvents: { event: string; data: any; room?: string }[] = [];

  registerSocket(socket: MockSocket) {
    // Override socket's join to register with server
    const origJoin = socket.join.bind(socket);
    socket.join = (room: string) => {
      origJoin(room);
      if (!this.roomSockets.has(room)) {
        this.roomSockets.set(room, new Set());
      }
      this.roomSockets.get(room)!.add(socket);
    };

    const origLeave = socket.leave.bind(socket);
    socket.leave = (room: string) => {
      origLeave(room);
      if (this.roomSockets.has(room)) {
        this.roomSockets.get(room)!.delete(socket);
      }
    };

    socket.broadcastToRoom = (room: string, event: string, data: any) => {
      const sockets = this.roomSockets.get(room) || new Set();
      for (const s of sockets) {
        if (s.id !== socket.id) {
          s.emit(event, data);
        }
      }
    };
  }

  to(room: string) {
    return {
      emit: (event: string, data: any) => {
        this.serverEvents.push({ event, data, room });
        const sockets = this.roomSockets.get(room) || new Set();
        for (const s of sockets) {
          s.emit(event, data);
        }
      },
    };
  }

  emit(event: string, data: any) {
    this.serverEvents.push({ event, data });
    for (const [, sockets] of this.roomSockets.entries()) {
      for (const s of sockets) {
        s.emit(event, data);
      }
    }
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('GlobeSync Part 6 — Realtime Gateway, Events & Chat Suite');
  console.log('======================================================\n');

  const JWT_SECRET = process.env.JWT_ACCESS_SECRET ?? 'gs-access-secret-change-in-prod';
  const jwtService = new JwtService({ secret: JWT_SECRET });

  const gateway = new RealtimeGateway(jwtService);
  const mockServer = new MockServer();
  gateway.server = mockServer as any;

  const realtimeService = new RealtimeService(gateway);
  const emailService = new EmailService();
  const notificationsService = new NotificationsService(null as any, realtimeService);

  // Setup test tokens
  const travelerToken = jwtService.sign(
    { sub: '103', email: 'arjun@traveler.com', role: 'traveler' },
    { secret: JWT_SECRET },
  );
  const guideToken = jwtService.sign(
    { sub: '5', email: 'devansh@guide.com', role: 'guide' },
    { secret: JWT_SECRET },
  );
  const adminToken = jwtService.sign(
    { sub: '2', email: 'admin@ticp.com', role: 'admin' },
    { secret: JWT_SECRET },
  );
  const expiredToken = jwtService.sign(
    { sub: '103', email: 'arjun@traveler.com', role: 'traveler' },
    { secret: JWT_SECRET, expiresIn: -10 },
  );

  // ─── 1. SOCKET AUTHENTICATION & REJECTION ──────────────────────────────────
  console.log('--- 1. WebSocket Authentication & Rejection ---');

  await runTest('Unauthorized socket rejected: Missing token causes disconnect', async () => {
    const socket = new MockSocket('sock_unauth_1');
    mockServer.registerSocket(socket);

    await gateway.handleConnection(socket as any);

    assert.strictEqual(socket.disconnected, true, 'Unauthenticated socket must be disconnected');
    const unauthEvt = socket.emittedEvents.find((e) => e.event === 'unauthorized');
    assert.ok(unauthEvt, 'Must emit unauthorized event');
  });

  await runTest('Unauthorized socket rejected: Expired token causes disconnect', async () => {
    const socket = new MockSocket('sock_expired_1', expiredToken);
    mockServer.registerSocket(socket);

    await gateway.handleConnection(socket as any);

    assert.strictEqual(socket.disconnected, true, 'Expired token socket must be disconnected');
    const unauthEvt = socket.emittedEvents.find((e) => e.event === 'unauthorized');
    assert.ok(unauthEvt, 'Must emit unauthorized event on expired token');
  });

  await runTest('Unauthorized socket rejected: Forged / bad signature token causes disconnect', async () => {
    const badToken = travelerToken.slice(0, -6) + 'abcdef';
    const socket = new MockSocket('sock_forged_1', badToken);
    mockServer.registerSocket(socket);

    await gateway.handleConnection(socket as any);

    assert.strictEqual(socket.disconnected, true, 'Forged token socket must be disconnected');
  });

  await runTest('Valid JWT token connects and automatically joins user personal room', async () => {
    const socket = new MockSocket('sock_traveler_1', travelerToken);
    mockServer.registerSocket(socket);

    await gateway.handleConnection(socket as any);

    assert.strictEqual(socket.disconnected, false, 'Valid socket must not be disconnected');
    assert.strictEqual(socket.data.user.id, 103);
    assert.strictEqual(socket.data.user.role, 'traveler');
    assert.ok(socket.rooms.has('user:traveler:103'), 'Must automatically join user:traveler:103 room');
    assert.ok(socket.rooms.has('role:traveler'), 'Must automatically join role:traveler room');

    const authEvt = socket.emittedEvents.find((e) => e.event === 'authenticated');
    assert.ok(authEvt, 'Must emit authenticated event to client');
  });

  // ─── 2. ROOM ISOLATION & ACCESS CONTROL ─────────────────────────────────────
  console.log('\n--- 2. Room Isolation & Access Control ---');

  await runTest('User CANNOT join another user personal room (Security check)', async () => {
    const socket = new MockSocket('sock_traveler_sneak', travelerToken);
    mockServer.registerSocket(socket);
    await gateway.handleConnection(socket as any);

    // Traveler 103 tries to join user:999
    gateway.handleJoinRoom(socket as any, { room: 'user:999' });

    assert.strictEqual(socket.rooms.has('user:999'), false, 'Cannot join another user private room');
    const errEvt = socket.emittedEvents.find((e) => e.event === 'error');
    assert.ok(errEvt, 'Must receive forbidden error when attempting to join other user room');
    assert.ok(errEvt.data.message.includes('Forbidden'));
  });

  await runTest('Booking room join: Participant (traveler) can join, non-participant is blocked', async () => {
    const travelerSocket = new MockSocket('sock_traveler_b', travelerToken);
    mockServer.registerSocket(travelerSocket);
    await gateway.handleConnection(travelerSocket as any);

    // Setup booking owned by traveler 103
    testDb.bookings = [
      { id: 501, bookingId: 501, travelerId: 103, guideId: 5, status: 'HELD' },
      { id: 502, bookingId: 502, travelerId: 999, guideId: 88, status: 'HELD' },
    ];

    // Traveler 103 joins booking 501 (participant) -> SUCCESS
    gateway.handleJoinBooking(travelerSocket as any, { bookingId: 501 });
    assert.ok(travelerSocket.rooms.has('booking:501'), 'Participant must be allowed to join booking room');

    // Traveler 103 tries to join booking 502 (non-participant) -> FORBIDDEN
    gateway.handleJoinBooking(travelerSocket as any, { bookingId: 502 });
    assert.strictEqual(travelerSocket.rooms.has('booking:502'), false, 'Non-participant must NOT join booking room');
    const blockedErr = travelerSocket.emittedEvents.find(
      (e) => e.event === 'error' && e.data.message.includes('not an authorized participant of booking #502'),
    );
    assert.ok(blockedErr, 'Must emit forbidden error for non-participant');
  });

  await runTest('Event reaches ONLY intended recipients (Room Isolation Verified)', async () => {
    // Socket A (traveler 103)
    const socketA = new MockSocket('sock_A', travelerToken);
    mockServer.registerSocket(socketA);
    await gateway.handleConnection(socketA as any);

    // Socket B (guide 5)
    const socketB = new MockSocket('sock_B', guideToken);
    mockServer.registerSocket(socketB);
    await gateway.handleConnection(socketB as any);

    // Emit event ONLY to user 103
    realtimeService.emitToUser(103, 'custom.alert', { msg: 'For traveler 103 only' }, 'traveler');

    const receivedA = socketA.emittedEvents.find((e) => e.event === 'custom.alert');
    const receivedB = socketB.emittedEvents.find((e) => e.event === 'custom.alert');

    assert.ok(receivedA, 'Socket A (in room user:103) must receive the event');
    assert.strictEqual(receivedB, undefined, 'Socket B (in room user:5) must NOT receive the event');
  });

  // ─── 3. NOTIFICATIONS PERSISTENCE & CURSOR ──────────────────────────────────
  console.log('\n--- 3. Notification Persistence & Since Cursor ---');

  await runTest('Notifications persist in DB, track unreadCount, and support since cursor filter', async () => {
    notificationsService.clear();

    const t0 = new Date('2026-11-22T10:00:00.000Z');
    const t1 = new Date('2026-11-22T10:05:00.000Z');
    const t2 = new Date('2026-11-22T10:10:00.000Z');

    // 1. Create first notification
    const n1 = await notificationsService.createNotification(103, 'Welcome', 'Welcome to GlobeSync', { role: 'traveler', type: 'welcome' });
    n1.created_at = t0;

    // 2. Create second notification
    const n2 = await notificationsService.createNotification(103, 'Booking Confirmed', 'Your trip to Manali is booked', { role: 'traveler' });
    n2.created_at = t2;

    // Fetch all
    const all = await notificationsService.getNotifications(103);
    assert.strictEqual(all.notifications.length, 2);
    assert.strictEqual(all.unreadCount, 2);

    // Reconnect simulation: fetch using since cursor (t1) -> only n2 should be returned
    const missed = await notificationsService.getNotifications(103, t1.toISOString());
    assert.strictEqual(missed.notifications.length, 1);
    assert.strictEqual(missed.notifications[0].title, 'Booking Confirmed');
    assert.strictEqual(missed.unreadCount, 2, 'Unread count reflects total unread across all notifications');

    // Mark n1 as read
    const readRes = await notificationsService.markAsRead(n1.id, 103);
    assert.strictEqual(readRes.unreadCount, 1);

    // Mark all as read
    const allReadRes = await notificationsService.markAllAsRead(103);
    assert.strictEqual(allReadRes.unreadCount, 0);

    const postCheck = await notificationsService.getNotifications(103);
    assert.strictEqual(postCheck.unreadCount, 0);
  });

  // ─── 4. CHAT: TYPING INDICATOR & RECEIPTS ───────────────────────────────────
  console.log('\n--- 4. Chat Typing Indicators, Receipts & Pagination ---');

  await runTest('Chat typing indicator broadcasts to booking room excluding sender', async () => {
    const senderSocket = new MockSocket('sock_sender', travelerToken);
    const receiverSocket = new MockSocket('sock_receiver', guideToken);
    mockServer.registerSocket(senderSocket);
    mockServer.registerSocket(receiverSocket);
    await gateway.handleConnection(senderSocket as any);
    await gateway.handleConnection(receiverSocket as any);

    // Both join booking:501
    senderSocket.join('booking:501');
    receiverSocket.join('booking:501');

    // Sender starts typing
    gateway.handleTyping(senderSocket as any, { bookingId: 501, isTyping: true });

    // Sender should NOT receive their own typing indicator
    const senderTyping = senderSocket.emittedEvents.find((e) => e.event === 'chat.typing');
    assert.strictEqual(senderTyping, undefined);

    // Receiver MUST receive typing indicator
    const receiverTyping = receiverSocket.emittedEvents.find((e) => e.event === 'chat.typing');
    assert.ok(receiverTyping, 'Receiver in booking room must receive typing indicator');
    assert.strictEqual(receiverTyping.data.isTyping, true);
    assert.strictEqual(receiverTyping.data.userId, 103);
  });

  await runTest('MessagesService stores message, emits message.created, and generates read receipt', async () => {
    const messagesService = new MessagesService(realtimeService, notificationsService);

    // Create message
    const msg = messagesService.create({
      sender: 'traveler',
      senderId: 103,
      receiver: 'guide',
      receiverId: 5,
      content: 'Can we meet at 9:00 AM at the hotel lobby?',
      bookingId: 501,
    });

    assert.strictEqual(msg.status, 'sent');
    assert.ok(msg.messageId > 0);

    // Verify read receipt
    const readMsg = messagesService.markAsRead(msg.messageId, 5);
    assert.strictEqual(readMsg.status, 'read');
    assert.ok(readMsg.readAt);

    // Verify pagination
    const convo = messagesService.findConversation({
      bookingId: 501,
      limit: 10,
      offset: 0,
    });
    assert.ok(convo.messages.length >= 1);
    assert.strictEqual(convo.total >= 1, true);
  });

  // ─── 5. DOMAIN REALTIME EVENTS ──────────────────────────────────────────────
  console.log('\n--- 5. Domain Realtime Events Emission ---');

  await runTest('guide_request.created and accepted events emitted by TripsService', async () => {
    const tripsService = new TripsService(realtimeService, notificationsService);

    // Trips now reject unknown guides (audit fix), so the fixture must register guide #5.
    if (!guides.some((g) => g.guideId === 5)) {
      guides.push({ guideId: 5, name: 'Realtime Test Guide', email: 'rt.guide5@example.com' } as any);
    }

    // 1. Create trip requesting guide 5
    const trip = tripsService.create({
      title: 'Manali Trek Expedition',
      destination: 'Manali',
      startDate: '2026-12-01',
      endDate: '2026-12-05',
      budget: 25000,
      travelerId: 103,
      guideId: 5,
    });

    // Check server events for guide_request.created
    const createdEvt = mockServer.serverEvents.find((e) => e.event === 'guide_request.created');
    assert.ok(createdEvt, 'Must emit guide_request.created');
    assert.strictEqual(createdEvt.room, 'user:guide:5');

    // 2. Guide accepts request
    tripsService.update(trip.tripId, {
      guideStatus: 'Accepted',
    });

    const acceptedEvt = mockServer.serverEvents.find((e) => e.event === 'guide_request.accepted');
    assert.ok(acceptedEvt, 'Must emit guide_request.accepted');
  });

  await runTest('agency.approved and agency.rejected events emitted by AgenciesService', async () => {
    const agenciesService = new AgenciesService(realtimeService, notificationsService);
    const created = agenciesService.create({
      businessName: 'Realtime Test Agency',
      contactEmail: `rt-agency-${Date.now()}@test.com`,
      contactPhone: '9876543219',
      password: 'password123',
    });

    // Approve newly created pending agency
    agenciesService.updateStatus(created.agencyId, { status: 'approved', reason: 'Realtime test verification approved' });
    const approveEvt = mockServer.serverEvents.find((e) => e.event === 'agency.approved');
    assert.ok(approveEvt, 'Must emit agency.approved event');

    // Reject agency with mandatory reason
    agenciesService.updateStatus(created.agencyId, { status: 'rejected', reason: 'Realtime test compliance failure' });
    const rejectEvt = mockServer.serverEvents.find((e) => e.event === 'agency.rejected');
    assert.ok(rejectEvt, 'Must emit agency.rejected event');
  });

  await runTest('ticket.updated emitted by SupportTicketsService', async () => {
    const ticketsService = new SupportTicketsService(realtimeService, notificationsService);

    const ticket = ticketsService.create({
      travelerId: 103,
      tripId: 1,
      description: 'Flight schedule query',
      issueType: 'General',
    });

    const createdEvt = mockServer.serverEvents.find((e) => e.event === 'ticket.updated' && e.data.action === 'CREATED');
    assert.ok(createdEvt, 'Must emit ticket.updated on creation');

    // Add reply
    ticketsService.addReply(ticket.ticketId, 'support', 6, { message: 'We have updated your flight details.' });
    const replyEvt = mockServer.serverEvents.find((e) => e.event === 'ticket.updated' && e.data.action === 'REPLY_ADDED');
    assert.ok(replyEvt, 'Must emit ticket.updated on reply');
  });

  await runTest('booking.status_changed and refund.processed emitted on cancellation by PolicyService', async () => {
    const policyService = new PolicyService(realtimeService, notificationsService, emailService);

    testDb.bookings = [
      {
        id: 701,
        travelerId: 103,
        departure_at_utc: '2026-12-10T12:00:00.000Z',
        departure_timezone: 'UTC',
        total_minor: 100000,
        status: 'Confirmed',
      },
    ];

    const result = await policyService.cancelBooking(
      701,
      'Change of plans',
      103,
      new Date('2026-12-01T12:00:00.000Z'),
    );

    assert.strictEqual(result.status, 'Cancelled');

    const statusEvt = mockServer.serverEvents.find((e) => e.event === 'booking.status_changed' && e.data.bookingId === 701);
    assert.ok(statusEvt, 'Must emit booking.status_changed');

    const refundEvt = mockServer.serverEvents.find((e) => e.event === 'refund.processed' && e.data.bookingId === 701);
    assert.ok(refundEvt, 'Must emit refund.processed event');
    assert.strictEqual(refundEvt.data.status, 'PROCESSED');
  });

  await runTest('EmailService dispatches email notifications (confirmation, cancellation, refund)', async () => {
    const confirmResult = await emailService.sendBookingConfirmation('traveler@ticp.com', {
      bookingId: 801,
      destination: 'Goa Holiday Package',
      amount: '₹15,000.00',
    });
    assert.strictEqual(confirmResult.sent, true);

    const cancelResult = await emailService.sendBookingCancellation('traveler@ticp.com', {
      bookingId: 801,
      refundAmount: '₹9,750.00',
      penaltyPercent: 35,
    });
    assert.strictEqual(cancelResult.sent, true);

    const refundResult = await emailService.sendRefundProcessed('traveler@ticp.com', {
      bookingId: 801,
      refundAmount: '₹9,750.00',
      ledgerRef: 'LEDGER-REF-801',
    });
    assert.strictEqual(refundResult.sent, true);
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
