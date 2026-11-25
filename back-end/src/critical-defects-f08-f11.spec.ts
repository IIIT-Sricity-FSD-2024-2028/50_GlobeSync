import 'reflect-metadata';
import * as assert from 'assert';
import { BadRequestException, ConflictException } from '@nestjs/common';

import {
  trips,
  bookings,
  guides,
  itineraries,
  guideReassignmentRequests,
  supportTickets,
} from './data';
import { testDb } from './database/test-database';
import { TripsService } from './trips/trips.service';
import { ItinerariesService } from './itineraries/itineraries.service';
import { GuidesService } from './guides/guides.service';
import { GuideAvailabilityService } from './guides/guide-availability.service';
import { DashboardService } from './dashboard/dashboard.service';
import { NotificationsService } from './notifications/notifications.service';
import { PolicyService } from './policy/policy.service';
import { BookingsService } from './bookings/bookings.service';
import { PricingService } from './bookings/pricing.service';
import { InventoryService } from './inventory/inventory.service';
import { ManualInventoryProviderAdapter } from './inventory/adapters/manual-inventory-provider.adapter';
import { IdempotencyService } from './common/idempotency/idempotency.service';
import { SupportTicketsService } from './support-tickets/support-tickets.service';
import { addCalendarDaysYmd, todayInIndiaYmd } from './common/config/trip-date-policy';

const notificationsService = new NotificationsService(undefined as any, undefined as any);
const policyService = new PolicyService(undefined, notificationsService);
const inventoryService = new InventoryService(new ManualInventoryProviderAdapter());
const guideAvailabilityService = new GuideAvailabilityService();
const guidesService = new GuidesService(notificationsService, undefined, guideAvailabilityService);
const tripsService = new TripsService(undefined, notificationsService, guideAvailabilityService, policyService);
const itinerariesService = new ItinerariesService();
const dashboardService = new DashboardService();
const pricingService = new PricingService(inventoryService, policyService);
const idempotencyService = new IdempotencyService();
const bookingsService = new BookingsService(
  policyService,
  inventoryService,
  guideAvailabilityService,
  pricingService,
  idempotencyService,
);
const supportTicketsService = new SupportTicketsService(undefined, notificationsService);

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
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

async function main() {
  console.log('\n======================================================');
  console.log('GlobeSync Critical Defects F08-F11 Regression Suite');
  console.log('======================================================');

  const origTrips = trips.map((t) => ({ ...t }));
  const origBookings = bookings.map((b) => ({ ...b }));
  const origGuides = guides.map((g) => ({ ...g }));
  const origItins = itineraries.map((i) => ({ ...i }));
  const origReassign = guideReassignmentRequests.map((r) => ({ ...r }));
  const origTickets = supportTickets.map((t) => ({ ...t }));
  const origBlocked = (testDb.guideBlockedDates || []).map((b) => ({ ...b }));

  const restoreAll = () => {
    trips.length = 0;
    trips.push(...origTrips.map((t) => ({ ...t })));
    bookings.length = 0;
    bookings.push(...origBookings.map((b) => ({ ...b })));
    guides.length = 0;
    guides.push(...origGuides.map((g) => ({ ...g })));
    itineraries.length = 0;
    itineraries.push(...origItins.map((i) => ({ ...i })));
    guideReassignmentRequests.length = 0;
    guideReassignmentRequests.push(...origReassign.map((r) => ({ ...r })));
    supportTickets.length = 0;
    supportTickets.push(...origTickets.map((t) => ({ ...t })));
    testDb.guideBlockedDates = origBlocked.map((b) => ({ ...b }));
  };

  try {
    const todayYmd = todayInIndiaYmd();

    // ─── F08: Activity Planner Read-Only on Cancelled Trips ──────────────────
    console.log('\n--- F08: Activity Planner & Backend Itinerary Guard ---');

    await test('F08: Eligible trip allows itinerary mutations; cancelling preserves history and blocks create/update/delete', () => {
      const t = tripsService.create(
        {
          destination: 'Jaipur',
          origin: 'New Delhi',
          startDate: addCalendarDaysYmd(todayYmd, 10),
          endDate: addCalendarDaysYmd(todayYmd, 13),
          budget: 24000,
          travelerId: 1,
          status: 'Pending',
          transportDetails: { transportType: 'Flight', carrier: 'IndiGo', lodgingTier: 'Palace' },
        },
        { role: 'traveler', userId: 1 },
      );

      const act = itinerariesService.create({
        tripId: t.tripId,
        city: 'Jaipur',
        dayNumber: 1,
        activity: 'Amber Fort Morning Tour',
        time: '09:00',
      });
      assert.ok(act.itineraryId > 0);

      const edited = itinerariesService.update(act.itineraryId, { activity: 'Amber Fort Guided Tour' });
      assert.strictEqual(edited.activity, 'Amber Fort Guided Tour');

      // Cancel trip
      tripsService.updateStatus(t.tripId, 'Cancelled', 'Traveler plans changed', { role: 'traveler', userId: 1 });

      // Historical itinerary remains accessible read-only
      const history = itinerariesService.findByTrip(t.tripId) as any[];
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].activity, 'Amber Fort Guided Tour');

      // Direct API mutations (create, update, delete) are rejected
      assert.throws(
        () => itinerariesService.create({ tripId: t.tripId, city: 'Jaipur', dayNumber: 2, activity: 'Hawa Mahal', time: '14:00' }),
        BadRequestException,
      );
      assert.throws(
        () => itinerariesService.update(act.itineraryId, { activity: 'Mutated After Cancel' }),
        BadRequestException,
      );
      assert.throws(() => itinerariesService.remove(act.itineraryId), BadRequestException);
    });

    // ─── F09: Trip Cancellation Guide & Reassignment Lifecycle ───────────────
    console.log('\n--- F09: Trip Cancellation Invalidation of Guide & Reassignment Workflows ---');

    await test('F09: Cancelling trip with pending guide request invalidates request, updates dashboard, and blocks stale acceptance', () => {
      const g1 = guides[0];
      const tPending = tripsService.create(
        {
          destination: 'Goa',
          origin: 'Mumbai',
          startDate: addCalendarDaysYmd(todayYmd, 15),
          endDate: addCalendarDaysYmd(todayYmd, 18),
          budget: 20000,
          travelerId: 1,
          guideId: g1.guideId,
          status: 'Planning',
          transportDetails: { transportType: 'Flight', carrier: 'IndiGo', lodgingTier: 'Beach Stay' },
        },
        { role: 'traveler', userId: 1 },
      );

      const beforeDash = dashboardService.getGuideDashboard(g1.guideId);
      assert.ok(beforeDash.pendingRequests >= 1);

      tripsService.updateStatus(tPending.tripId, 'Cancelled', 'Cancelled before confirmation', {
        role: 'traveler',
        userId: 1,
      });

      const afterTrip = tripsService.findOne(tPending.tripId);
      assert.strictEqual(afterTrip.guideStatus, 'Cancelled');
      const afterDash = dashboardService.getGuideDashboard(g1.guideId);
      assert.strictEqual(afterDash.pendingRequests, beforeDash.pendingRequests - 1);

      assert.throws(
        () => tripsService.update(tPending.tripId, { guideStatus: 'Accepted' }, { role: 'guide', userId: g1.guideId }),
        BadRequestException,
      );
    });

    await test('F09: Cancelling trip with pending reassignment invalidates consent & guide acceptance and frees dates', () => {
      const g1 = guides[0];
      const g2 = guides[1];
      const start = addCalendarDaysYmd(todayYmd, 25);
      const end = addCalendarDaysYmd(todayYmd, 28);

      const t = tripsService.create(
        {
          destination: 'Manali',
          origin: 'New Delhi',
          startDate: start,
          endDate: end,
          budget: 30000,
          travelerId: 2,
          guideId: g1.guideId,
          status: 'Pending',
          travelersCount: 3,
          transportDetails: { transportType: 'Bus', carrier: 'Volvo', lodgingTier: 'Cottage' },
        },
        { role: 'traveler', userId: 2 },
      );

      tripsService.update(t.tripId, { guideStatus: 'Accepted' }, { role: 'guide', userId: g1.guideId });
      assert.strictEqual(guideAvailabilityService.checkAvailability(g1.guideId, start, end), false);

      const req = tripsService.requestGuideReassignment(t.tripId, g2.guideId, 'Reassign before cancel', {
        userId: 1,
        role: 'admin',
        name: 'Admin',
      });
      assert.strictEqual(req.status, 'PENDING_CONSENT');

      tripsService.updateStatus(t.tripId, 'Cancelled', 'Client emergency', { role: 'traveler', userId: 2 });

      // Guide dates released & reassignment invalidated
      assert.strictEqual(guideAvailabilityService.checkAvailability(g1.guideId, start, end), true);
      assert.strictEqual(req.status, 'CANCELLED');
      assert.throws(
        () => tripsService.respondTravelerConsent(req.id, 'ACCEPT', 'Late consent', 2),
        BadRequestException,
      );
    });

    await test('F09: Cancelling a single booking does NOT automatically cancel the entire trip', async () => {
      const t = tripsService.create(
        {
          destination: 'Kerala',
          origin: 'Chennai',
          startDate: addCalendarDaysYmd(todayYmd, 30),
          endDate: addCalendarDaysYmd(todayYmd, 33),
          budget: 22000,
          travelerId: 1,
          status: 'Pending',
          transportDetails: { transportType: 'Flight', carrier: 'IndiGo', lodgingTier: 'Backwater Resort' },
        },
        { role: 'traveler', userId: 1 },
      );

      const b1 = await bookingsService.create({
        tripId: t.tripId,
        travelerId: 1,
        service: 'IndiGo Flight',
        type: 'Flight',
        amount: 6000,
        transportMode: 'Flight',
      });
      const b2 = await bookingsService.create({
        tripId: t.tripId,
        travelerId: 1,
        service: 'Backwater Resort',
        type: 'Hotel',
        amount: 12000,
      });

      await policyService.cancelBooking(b1.bookingId, 'Switching airline', 1);
      assert.strictEqual(bookingsService.findOne(b1.bookingId).status, 'CANCELLED');
      assert.strictEqual(bookingsService.findOne(b2.bookingId).status, 'HELD');
      assert.strictEqual(tripsService.findOne(t.tripId).status, 'Pending');
    });

    // ─── F10: Support Ticket Creation & Privacy ──────────────────────────────
    console.log('\n--- F10: Cancellation Assistance Support Workflow ---');

    await test('F10: Traveler creates cancellation assistance ticket without cancelling booking, Support replies cleanly', () => {
      const ticket = supportTicketsService.create({
        travelerId: 1,
        bookingId: 1,
        issueType: 'Cancellation Assistance [BK#1]: Urgent flight cancellation help',
        description: 'Flight within 12h cutoff, requesting policy assistance.',
        priority: 'High',
        status: 'Open',
      });
      assert.ok(ticket.ticketId > 0);

      const reply = supportTicketsService.addReply(ticket.ticketId, 'support', 1, {
        message: 'We have received your request and are reviewing airline waiver eligibility.',
      });
      assert.ok(reply.replyId > 0 && reply.message.includes('airline waiver'));
    });

    // ─── F11: Guide Multiple Non-Overlapping Date-Based Assignments ──────────
    console.log('\n--- F11: Date-Based Multi-Assignment Guide Availability ---');

    await test('F11: Same guide accepts Dec 1-5 & Dec 6-10 & Dec 11-15, rejects overlapping Dec 4-8, releases on cancel', () => {
      const g = guides[2] || guides[0];
      const d1s = addCalendarDaysYmd(todayYmd, 60);
      const d1e = addCalendarDaysYmd(todayYmd, 64);
      const d2s = addCalendarDaysYmd(todayYmd, 65);
      const d2e = addCalendarDaysYmd(todayYmd, 69);
      const overlapS = addCalendarDaysYmd(todayYmd, 63);
      const overlapE = addCalendarDaysYmd(todayYmd, 67);
      const d4s = addCalendarDaysYmd(todayYmd, 70);
      const d4e = addCalendarDaysYmd(todayYmd, 74);

      const t1 = tripsService.create(
        {
          destination: 'Shimla',
          origin: 'Delhi',
          startDate: d1s,
          endDate: d1e,
          budget: 15000,
          travelerId: 1,
          guideId: g.guideId,
          travelersCount: 2,
          status: 'Pending',
          transportDetails: { transportType: 'Bus', carrier: 'HRTC', lodgingTier: 'Lodge' },
        },
        { role: 'traveler', userId: 1 },
      );
      const t2 = tripsService.create(
        {
          destination: 'Dharamshala',
          origin: 'Delhi',
          startDate: d2s,
          endDate: d2e,
          budget: 16000,
          travelerId: 2,
          guideId: g.guideId,
          travelersCount: 4,
          status: 'Pending',
          transportDetails: { transportType: 'Bus', carrier: 'HRTC', lodgingTier: 'Resort' },
        },
        { role: 'traveler', userId: 2 },
      );
      const tOverlap = tripsService.create(
        {
          destination: 'Kullu',
          origin: 'Delhi',
          startDate: overlapS,
          endDate: overlapE,
          budget: 15000,
          travelerId: 3,
          guideId: g.guideId,
          status: 'Pending',
          transportDetails: { transportType: 'Bus', carrier: 'HRTC', lodgingTier: 'Camp' },
        },
        { role: 'traveler', userId: 3 },
      );
      const t4 = tripsService.create(
        {
          destination: 'Spiti',
          origin: 'Delhi',
          startDate: d4s,
          endDate: d4e,
          budget: 22000,
          agencyId: 1,
          guideId: g.guideId,
          travelersCount: 3,
          status: 'Pending',
          transportDetails: { transportType: 'Bus', carrier: 'HRTC', lodgingTier: 'Homestay' },
        },
        { role: 'agency', userId: 1 },
      );

      // Accept t1 (Dec 1-5) & t2 (Dec 6-10) & t4 (Dec 11-15) -> ALL succeed
      tripsService.update(t1.tripId, { guideStatus: 'Accepted' }, { role: 'guide', userId: g.guideId });
      tripsService.update(t2.tripId, { guideStatus: 'Accepted' }, { role: 'guide', userId: g.guideId });
      tripsService.update(t4.tripId, { guideStatus: 'Accepted' }, { role: 'guide', userId: g.guideId });

      // Overlapping Dec 4-8 MUST be rejected with ConflictException
      assert.throws(
        () => tripsService.update(tOverlap.tripId, { guideStatus: 'Accepted' }, { role: 'guide', userId: g.guideId }),
        ConflictException,
      );

      // Check date-filtered guide availability API
      const availOnOverlap = guidesService.findAvailableForDates(overlapS, overlapE);
      const gEntryOverlap = availOnOverlap.find((x) => x.guideId === g.guideId);
      assert.strictEqual(gEntryOverlap?.isAvailableForDates, false);

      const futureS = addCalendarDaysYmd(todayYmd, 90);
      const futureE = addCalendarDaysYmd(todayYmd, 94);
      const availFuture = guidesService.findAvailableForDates(futureS, futureE);
      const gEntryFuture = availFuture.find((x) => x.guideId === g.guideId);
      assert.strictEqual(gEntryFuture?.isAvailableForDates, true);

      // Verify guide dashboard traveler & passenger counts
      const dash = dashboardService.getGuideDashboard(g.guideId);
      assert.ok(dash.assignedTripsCount >= 3);
      assert.ok(dash.assignedPassengersCount >= 9);

      // Cancelling t1 frees d1s..d1e dates
      tripsService.updateStatus(t1.tripId, 'Cancelled', 'Traveler reschedule', { role: 'traveler', userId: 1 });
      assert.strictEqual(guideAvailabilityService.checkAvailability(g.guideId, d1s, d1e), true);
    });
  } finally {
    restoreAll();
  }

  console.log(`\n======================================================`);
  console.log(`F08-F11 Regression Results: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
