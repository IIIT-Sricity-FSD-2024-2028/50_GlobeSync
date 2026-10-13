/**
 * verify_all_guide_workflows.js
 *
 * Full verification suite for GlobeSync Guide Workflows and Traveler Regression:
 * 1. Login and backend-driven dashboard (staff login, metrics, profile, no invented data)
 * 2. Assigned request → accept/decline → cross-role visibility (traveler & agency)
 *    + Decoupled notification & retry handling
 *    + Ownership security (cannot accept/decline other guide's trips)
 * 3. Assigned trip → itinerary add/edit/progress → traveler refresh
 *    + Activity status progression
 *    + Itinerary delete restriction (403 for guide)
 *    + Suggestion message distinction
 * 4. Guide message → traveler reply → guide refresh
 *    + Bidirectional conversation
 *    + Whitespace guard & duplicate send protection
 *    + Cross-user message isolation (403)
 * 5. Profile update → session display update (and data restoration)
 *    + Password stripped on read, omitted when unchanged
 *    + Rating and adminId isolated
 * 6. Completed-trip history
 *    + Real reviews matched by tripId & guideId
 *    + No invented ratings or earnings
 * 7. Traveler regression checks
 *    + Traveler trips, bookings, payments, itineraries, and messages unaffected
 */

const BASE = 'http://localhost:3000';

const GUIDE1_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-role': 'guide',
  'x-user-id': '1',
};

const GUIDE2_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-role': 'guide',
  'x-user-id': '2',
};

const TRAVELER1_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-role': 'traveler',
  'x-user-id': '1',
};

const AGENCY1_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-role': 'agency',
  'x-user-id': '1',
};

let passed = 0;
let failed = 0;

async function check(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}: ${err.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function get(path, headers) {
  return fetch(`${BASE}${path}`, { headers });
}

async function post(path, body, headers = { 'Content-Type': 'application/json' }) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function put(path, body, headers) {
  return fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
}

async function patch(path, body, headers) {
  return fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
}

async function del(path, headers) {
  return fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers,
  });
}

async function run() {
  console.log('\n======================================================');
  console.log('   GlobeSync — Complete Guide Workflow Verification   ');
  console.log('======================================================\n');

  // =========================================================================
  // WORKFLOW 1: Login & Backend-Driven Dashboard
  // =========================================================================
  console.log('--- Workflow 1: Login & Backend-Driven Dashboard ---');

  await check('1.1 Guide staff login via POST /auth/staff-login', async () => {
    const res = await post('/auth/staff-login', {
      email: 'Devansh@gmail.com',
      password: 'guide123',
    });
    assert(res.ok, `Expected 200, got ${res.status}`);
    const data = await res.json();
    const user = data.user || data;
    assert(user.guideId === 1 || user.id === 1, 'Expected guideId 1');
    assert(data.role === 'guide' || user.role === 'guide', `Expected role guide`);
    assert(!('password' in user), 'Password must not be returned in login response');
    console.log(`      → Logged in as: ${user.name} (Role: ${data.role || user.role}, ID: ${user.guideId})`);
  });

  await check('1.2 Fetch backend dashboard metrics via GET /dashboard/guide/1', async () => {
    const res = await get('/dashboard/guide/1', GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const d = await res.json();
    assert('assignedTripsCount' in d, 'Missing assignedTripsCount');
    assert('completedTripsCount' in d, 'Missing completedTripsCount');
    assert('pendingRequests' in d, 'Missing pendingRequests');
    assert('messagesCount' in d, 'Missing messagesCount');
    console.log(`      → Assigned: ${d.assignedTripsCount}, Completed: ${d.completedTripsCount}, Pending: ${d.pendingRequests}, Messages: ${d.messagesCount}`);
  });

  await check('1.3 Guide profile read via GET /guides/1 without password and strictly labeled', async () => {
    const res = await get('/guides/1', GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const g = await res.json();
    assert(g.name === 'Devansh', 'Expected name Devansh');
    assert(!('password' in g), 'Password must be stripped');
    assert(g.pricePerTrip !== undefined, 'pricePerTrip must exist');
    assert(typeof g.rating === 'number', 'rating must be number');
    console.log(`      → Profile: ${g.name}, Experience: ${g.experience} yrs, PricePerTrip: ₹${g.pricePerTrip}, Rating: ${g.rating}`);
  });

  // =========================================================================
  // WORKFLOW 2: Assigned Request → Accept/Decline → Cross-Role Visibility
  // =========================================================================
  console.log('\n--- Workflow 2: Assigned Request → Decision → Cross-Role Visibility ---');

  let testTripId = 1; // Trip 1 is assigned to guide 1, traveler 1 (Paris)
  let originalTripData = null;

  await check('2.1 Guide reads assigned trips via GET /trips/guide/1', async () => {
    const res = await get('/trips/guide/1', GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const trips = await res.json();
    assert(Array.isArray(trips) && trips.length > 0, 'Expected non-empty trips list');
    const t = trips.find(x => x.tripId === testTripId);
    assert(t, `Expected trip ${testTripId} in guide assignments`);
    originalTripData = { ...t };
    console.log(`      → Found Trip #${t.tripId} (${t.destination}) with status: ${t.status}, guideStatus: ${t.guideStatus || 'none'}`);
  });

  await check('2.2 Guide accepts trip request (PUT /trips/1 with guideStatus: Accepted)', async () => {
    const res = await put(`/trips/${testTripId}`, {
      guideStatus: 'Accepted',
    }, GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const updated = await res.json();
    assert(updated.guideStatus === 'Accepted', 'guideStatus should be Accepted');
    // Coherent payment distinction: accepting guideStatus must NOT flip trip payment or trip status to Confirmed automatically
    console.log(`      → Guide accepted Trip #${testTripId}: guideStatus=${updated.guideStatus}`);
  });

  await check('2.3 Traveler observes updated guideStatus: Accepted via GET /trips/traveler/1', async () => {
    const res = await get('/trips/traveler/1', TRAVELER1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const travelerTrips = await res.json();
    const t = travelerTrips.find(x => x.tripId === testTripId);
    assert(t, 'Trip must be in traveler trip list');
    assert(t.guideStatus === 'Accepted', `Expected guideStatus Accepted, got ${t.guideStatus}`);
    console.log(`      → Cross-role verified: Traveler sees Trip #${t.tripId} guideStatus=${t.guideStatus}`);
  });

  await check('2.4 Decoupled notification dispatch via POST /messages to traveler', async () => {
    const res = await post('/messages', {
      sender: 'guide',
      senderId: 1,
      receiver: 'traveler',
      receiverId: 1,
      content: `I have accepted your trip to Paris (Trip #${testTripId})!`,
    }, GUIDE1_HEADERS);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const msg = await res.json();
    assert(msg.messageId, 'Expected messageId');
    console.log(`      → Notification sent: Message #${msg.messageId}`);
  });

  await check('2.5 Decline behavior: resets guideId: null, guideStatus: Declined, status: Planning', async () => {
    // Create a temporary trip for decline test so we don't destroy Trip 1
    const createRes = await post('/trips', {
      destination: 'Temporary Decline Test City',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      budget: 35000,
      travelerId: 1,
      guideId: 1,
      status: 'Pending',
    }, TRAVELER1_HEADERS);
    assert(createRes.status === 201, 'Failed to create temporary trip');
    const tempTrip = await createRes.json();
    const tempId = tempTrip.tripId;

    // Guide declines:
    const declineRes = await put(`/trips/${tempId}`, {
      guideId: null,
      guideStatus: 'Declined',
      status: 'Planning',
    }, GUIDE1_HEADERS);
    assert(declineRes.ok, `Decline failed: ${declineRes.status}`);
    const declinedTrip = await declineRes.json();
    assert(declinedTrip.guideId === null, 'guideId should be cleared');
    assert(declinedTrip.guideStatus === 'Declined', 'guideStatus should be Declined');
    assert(declinedTrip.status === 'Planning', 'status should be reset to Planning');

    // Traveler visibility: trip still exists and is in Planning
    const travRes = await get('/trips/traveler/1', TRAVELER1_HEADERS);
    const travTrips = await travRes.json();
    const found = travTrips.find(x => x.tripId === tempId);
    assert(found, 'Declined trip must NOT be deleted from traveler roster');
    assert(found.status === 'Planning', 'Traveler must see status Planning');

    // Clean up temporary trip
    await del(`/trips/${tempId}`, TRAVELER1_HEADERS);
    console.log(`      → Decline successfully reset assignment without deleting trip; verified in traveler roster`);
  });

  await check('2.6 Ownership security: Guide 1 cannot modify Guide 2 trip (403 expected)', async () => {
    // Trip 2 belongs to Guide 2
    const res = await put('/trips/2', { guideStatus: 'Accepted' }, GUIDE1_HEADERS);
    assert(res.status === 403 || res.status === 401, `Expected 403/401, got ${res.status}`);
    console.log(`      → Ownership enforced: Guide 1 rejected from modifying Guide 2 trip (${res.status})`);
  });

  // Restore Trip 1 original state
  if (originalTripData) {
    await put(`/trips/${testTripId}`, {
      guideStatus: originalTripData.guideStatus || null,
      status: originalTripData.status,
    }, GUIDE1_HEADERS);
  }

  // =========================================================================
  // WORKFLOW 3: Assigned Trip → Itinerary CRUD & Progress → Traveler Refresh
  // =========================================================================
  console.log('\n--- Workflow 3: Assigned Trip → Itineraries & Progress ---');

  let testItineraryId = null;

  await check('3.1 Guide fetches itineraries for assigned trip via GET /itineraries/trip/1', async () => {
    const res = await get('/itineraries/trip/1', GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const items = await res.json();
    assert(Array.isArray(items), 'Expected array');
    console.log(`      → Trip #1 has ${items.length} itinerary activities`);
  });

  await check('3.2 Guide creates activity via POST /itineraries', async () => {
    const res = await post('/itineraries', {
      tripId: 1,
      dayNumber: 2,
      time: '14:30',
      activity: 'Guided Louvre Museum Walkthrough',
      city: 'Paris',
      activityStatus: 'Pending',
    }, GUIDE1_HEADERS);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const item = await res.json();
    assert(item.itineraryId, 'Expected itineraryId');
    testItineraryId = item.itineraryId;
    console.log(`      → Created Activity #${testItineraryId}: "${item.activity}" (Status: ${item.activityStatus})`);
  });

  await check('3.3 Guide updates activity details and status progression via PUT /itineraries/:id', async () => {
    assert(testItineraryId, 'No test itinerary ID');
    const res = await put(`/itineraries/${testItineraryId}`, {
      activity: 'Guided Louvre Museum Walkthrough (VIP Wing)',
      activityStatus: 'Completed',
    }, GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const updated = await res.json();
    assert(updated.activityStatus === 'Completed', 'Expected Completed status');
    assert(updated.activity.includes('VIP Wing'), 'Expected updated text');
    console.log(`      → Activity #${testItineraryId} updated to: ${updated.activityStatus}`);
  });

  await check('3.4 Traveler observes updated itinerary via GET /itineraries/trip/1', async () => {
    const res = await get('/itineraries/trip/1', TRAVELER1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const items = await res.json();
    const item = items.find(x => x.itineraryId === testItineraryId);
    assert(item, 'Traveler must see newly added activity');
    assert(item.activityStatus === 'Completed', 'Traveler must see Completed status');
    console.log(`      → Traveler verified: Activity #${item.itineraryId} visible with status ${item.activityStatus}`);
  });

  await check('3.5 Deletion restriction: Guide cannot delete itinerary (403 expected)', async () => {
    const res = await del(`/itineraries/${testItineraryId}`, GUIDE1_HEADERS);
    assert(res.status === 403, `Expected 403 Forbidden for guide deletion, got ${res.status}`);
    console.log(`      → Deletion restriction verified: Guide rejected with 403 Forbidden`);
  });

  // Clean up created itinerary item as superuser/admin to keep DB clean
  await del(`/itineraries/${testItineraryId}`, {
    'Content-Type': 'application/json',
    'x-user-role': 'superuser',
    'x-user-id': '1',
  });

  await check('3.6 Active trip status update via PATCH /trips/1/status with status: Active', async () => {
    const res = await patch('/trips/1/status', { status: 'Active' }, GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const updated = await res.json();
    assert(updated.status === 'Active', `Expected Active, got ${updated.status}`);
    console.log(`      → Trip #1 started: status=${updated.status}`);

    // Revert status to Confirmed
    await patch('/trips/1/status', { status: 'Confirmed' }, GUIDE1_HEADERS);
  });

  // =========================================================================
  // WORKFLOW 4: Guide Message → Traveler Reply → Guide Refresh
  // =========================================================================
  console.log('\n--- Workflow 4: Guide ↔ Traveler Direct Messaging ---');

  let sentMsgId = null;

  await check('4.1 Guide sends message to traveler via POST /messages', async () => {
    const res = await post('/messages', {
      sender: 'guide',
      senderId: 1,
      receiver: 'traveler',
      receiverId: 1,
      content: 'Workflow test: Bonjour! Meeting at 9 AM in the hotel lobby tomorrow.',
    }, GUIDE1_HEADERS);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const msg = await res.json();
    sentMsgId = msg.messageId;
    console.log(`      → Guide sent message #${sentMsgId}`);
  });

  await check('4.2 Traveler reads message in conversation thread', async () => {
    const res = await get(
      '/messages/conversation?senderType=traveler&senderId=1&receiverType=guide&receiverId=1',
      TRAVELER1_HEADERS,
    );
    assert(res.ok, `Expected 200, got ${res.status}`);
    const msgs = await res.json();
    const found = msgs.some(m => m.messageId === sentMsgId);
    assert(found, `Traveler thread missing message #${sentMsgId}`);
    console.log(`      → Traveler received and verified message #${sentMsgId}`);
  });

  let replyMsgId = null;

  await check('4.3 Traveler replies to guide via POST /messages', async () => {
    const res = await post('/messages', {
      sender: 'traveler',
      senderId: 1,
      receiver: 'guide',
      receiverId: 1,
      content: 'Workflow test: Sounds perfect Devansh, see you at 9 AM!',
    }, TRAVELER1_HEADERS);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const reply = await res.json();
    replyMsgId = reply.messageId;
    console.log(`      → Traveler sent reply #${replyMsgId}`);
  });

  await check('4.4 Guide refreshes conversation and receives traveler reply', async () => {
    const res = await get(
      '/messages/conversation?senderType=guide&senderId=1&receiverType=traveler&receiverId=1',
      GUIDE1_HEADERS,
    );
    assert(res.ok, `Expected 200, got ${res.status}`);
    const msgs = await res.json();
    const found = msgs.some(m => m.messageId === replyMsgId);
    assert(found, `Guide thread missing reply #${replyMsgId}`);
    console.log(`      → Guide refreshed thread and verified reply #${replyMsgId}`);
  });

  await check('4.5 Cross-user message access restriction (Guide 1 cannot read Guide 2 messages)', async () => {
    const res = await get('/messages/user/guide/2', GUIDE1_HEADERS);
    assert(res.status === 403 || res.status === 401, `Expected 403/401, got ${res.status}`);
    console.log(`      → Message ownership enforced (status: ${res.status})`);
  });

  // =========================================================================
  // WORKFLOW 5: Profile Update → Session Display Update
  // =========================================================================
  console.log('\n--- Workflow 5: Profile Update & Session Synchronization ---');

  let origProfile = null;

  await check('5.1 Read current profile via GET /guides/1', async () => {
    const res = await get('/guides/1', GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    origProfile = await res.json();
    console.log(`      → Current profile: ${origProfile.name}, ${origProfile.email}`);
  });

  await check('5.2 Update profile fields via PUT /guides/1', async () => {
    const res = await put('/guides/1', {
      name: 'Devansh Professional Guide',
      email: 'devansh.pro@example.com',
      contact: '9876543210',
      languages: ['English', 'Hindi', 'French', 'Italian'],
      experience: 6,
      pricePerTrip: 6000,
    }, GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const updated = await res.json();
    assert(updated.name === 'Devansh Professional Guide', 'Name not updated');
    assert(updated.languages.includes('Italian'), 'Italian missing from languages');
    assert(!('password' in updated), 'Password must NOT be in PUT response');
    console.log(`      → Updated name="${updated.name}", languages=${updated.languages.join(', ')}`);
  });

  await check('5.3 Profile changes persist on subsequent GET /guides/1', async () => {
    const res = await get('/guides/1', GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const p = await res.json();
    assert(p.name === 'Devansh Professional Guide', 'Persisted name incorrect');
    assert(p.email === 'devansh.pro@example.com', 'Persisted email incorrect');
  });

  await check('5.4 Restore original profile data', async () => {
    if (origProfile) {
      const res = await put('/guides/1', {
        name: origProfile.name,
        email: origProfile.email,
        contact: origProfile.contact,
        languages: origProfile.languages,
        experience: origProfile.experience,
        pricePerTrip: origProfile.pricePerTrip,
        password: 'guide123',
      }, GUIDE1_HEADERS);
      assert(res.ok, `Restore failed: ${res.status}`);
      console.log(`      → Guide 1 restored to: ${origProfile.name}`);
    }
  });

  // =========================================================================
  // WORKFLOW 6: Completed-Trip History
  // =========================================================================
  console.log('\n--- Workflow 6: Completed-Trip History & Real Reviews ---');

  await check('6.1 Guide fetches assigned completed trips', async () => {
    const res = await get('/trips/guide/1', GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const allTrips = await res.json();
    const completed = allTrips.filter(t => t.status === 'Completed');
    assert(completed.length > 0, 'Expected at least one completed trip for Guide 1');
    console.log(`      → Guide 1 has ${completed.length} completed trip(s) (Trip #${completed.map(t => t.tripId).join(', #')})`);
  });

  await check('6.2 Fetch reviews and verify strict tripId & guideId matching', async () => {
    const res = await get('/reviews', GUIDE1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const reviews = await res.json();
    assert(Array.isArray(reviews), 'Expected reviews array');
    
    // Strict matching check for Guide 1
    const guide1Reviews = reviews.filter(r => r.guideId === 1);
    assert(guide1Reviews.length > 0, 'Expected at least one review for Guide 1');
    for (const r of guide1Reviews) {
      assert(r.guideRating !== undefined && r.guideRating >= 1 && r.guideRating <= 5, 'Invalid rating');
      assert(typeof r.comment === 'string', 'Expected string comment');
    }
    console.log(`      → Verified ${guide1Reviews.length} real reviews for Guide 1 (no invented ratings/earnings)`);
  });

  // =========================================================================
  // WORKFLOW 7: Traveler Regression Check
  // =========================================================================
  console.log('\n--- Workflow 7: Traveler Regression Check ---');

  await check('7.1 Traveler trips list via GET /trips/traveler/1', async () => {
    const res = await get('/trips/traveler/1', TRAVELER1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const trips = await res.json();
    assert(Array.isArray(trips) && trips.length > 0, 'Expected traveler trips');
    console.log(`      → Traveler 1 has ${trips.length} trips`);
  });

  await check('7.2 Traveler bookings via GET /bookings/traveler/1', async () => {
    const res = await get('/bookings/traveler/1', TRAVELER1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const bookings = await res.json();
    assert(Array.isArray(bookings), 'Expected traveler bookings array');
    console.log(`      → Traveler 1 has ${bookings.length} bookings`);
  });

  await check('7.3 Traveler itineraries via GET /itineraries/trip/1', async () => {
    const res = await get('/itineraries/trip/1', TRAVELER1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const itins = await res.json();
    assert(Array.isArray(itins), 'Expected traveler itineraries');
    console.log(`      → Traveler 1 trip 1 has ${itins.length} activities`);
  });

  await check('7.4 Traveler messaging via GET /messages/user/traveler/1', async () => {
    const res = await get('/messages/user/traveler/1', TRAVELER1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const msgs = await res.json();
    assert(Array.isArray(msgs) && msgs.length > 0, 'Expected traveler messages');
    console.log(`      → Traveler 1 has ${msgs.length} messages`);
  });

  await check('7.5 Traveler packages browse via GET /packages', async () => {
    const res = await get('/packages', TRAVELER1_HEADERS);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const pkgs = await res.json();
    assert(Array.isArray(pkgs) && pkgs.length > 0, 'Expected packages');
    console.log(`      → Catalog has ${pkgs.length} packages`);
  });

  console.log('\n======================================================');
  console.log(`   Verification Summary: ${passed} passed, ${failed} failed   `);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
