/**
 * verify_guide_shared_contracts.js
 * Comprehensive integration test suite validating guide repairs and shared contracts
 * against the live backend instance (http://localhost:3000).
 */
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || options.path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let body = null;
        try {
          body = data ? JSON.parse(data) : null;
        } catch (e) {
          body = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: body,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('======================================================');
  console.log('GlobeSync Guide Module & Shared Contracts Verification');
  console.log('======================================================\n');

  try {
    // -------------------------------------------------------------
    // 1. Acceptance before Payment
    // -------------------------------------------------------------
    console.log('--- 1. Acceptance before Payment ---');
    const trip1Res = await request({
      method: 'POST',
      path: '/trips',
      headers: { 'x-user-role': 'traveler', 'x-user-id': '1' },
    }, {
      destination: 'Shimla Acceptance First',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      budget: 30000,
      travelerId: 1,
      guideId: 1,
    });
    assert(trip1Res.status === 201, 'Trip created with guideId: 1');
    const trip1 = trip1Res.data;
    assert(trip1.guideStatus === 'Pending', 'Newly assigned trip has guideStatus: "Pending"');
    assert(trip1.status === 'Planning', 'Trip starts in "Planning" status');

    // Guide accepts before payment
    const accept1Res = await request({
      method: 'PUT',
      path: `/trips/${trip1.tripId}`,
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    }, {
      guideStatus: 'Accepted',
    });
    assert(accept1Res.status === 200, 'Guide successfully updates guideStatus to Accepted');
    assert(accept1Res.data.guideStatus === 'Accepted', 'guideStatus is now Accepted');
    assert(accept1Res.data.status === 'Planning', 'Trip status remains Planning (no premature payment confirmation)');

    // Traveler then makes payment and confirms trip
    await request({
      method: 'PATCH',
      path: `/trips/${trip1.tripId}/status`,
      headers: { 'x-user-role': 'traveler', 'x-user-id': '1' },
    }, { status: 'Pending' });

    const confirm1Res = await request({
      method: 'PATCH',
      path: `/trips/${trip1.tripId}/status`,
      headers: { 'x-user-role': 'traveler', 'x-user-id': '1' },
    }, { status: 'Confirmed' });
    assert(confirm1Res.status === 200, 'Trip transitions Planning -> Pending -> Confirmed');
    assert(confirm1Res.data.status === 'Confirmed', 'Trip status is now Confirmed');
    assert(confirm1Res.data.guideStatus === 'Accepted', 'Guide acceptance preserved after payment confirmation');

    // -------------------------------------------------------------
    // 2. Payment before Acceptance
    // -------------------------------------------------------------
    console.log('\n--- 2. Payment before Acceptance ---');
    const trip2Res = await request({
      method: 'POST',
      path: '/trips',
      headers: { 'x-user-role': 'traveler', 'x-user-id': '1' },
    }, {
      destination: 'Manali Payment First',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      budget: 42000,
      travelerId: 1,
      guideId: 1,
    });
    const trip2 = trip2Res.data;
    assert(trip2.guideStatus === 'Pending', 'Trip starts with guideStatus: Pending');

    // Traveler confirms payment before guide accepts
    await request({
      method: 'PATCH',
      path: `/trips/${trip2.tripId}/status`,
      headers: { 'x-user-role': 'traveler', 'x-user-id': '1' },
    }, { status: 'Pending' });

    const payBeforeRes = await request({
      method: 'PATCH',
      path: `/trips/${trip2.tripId}/status`,
      headers: { 'x-user-role': 'traveler', 'x-user-id': '1' },
    }, { status: 'Confirmed' });
    assert(payBeforeRes.data.status === 'Confirmed', 'Trip status is Confirmed before guide responds');
    assert(payBeforeRes.data.guideStatus === 'Pending', 'guideStatus remains Pending despite Confirmed payment');

    // Guide accepts
    const accept2Res = await request({
      method: 'PUT',
      path: `/trips/${trip2.tripId}`,
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    }, {
      guideStatus: 'Accepted',
    });
    assert(accept2Res.status === 200, 'Guide accepts trip whose payment was already confirmed');
    assert(accept2Res.data.guideStatus === 'Accepted', 'guideStatus updated to Accepted');
    assert(accept2Res.data.status === 'Confirmed', 'Trip status remains Confirmed');

    // -------------------------------------------------------------
    // 3. Decline
    // -------------------------------------------------------------
    console.log('\n--- 3. Guide Decline on Confirmed/Pending Trip ---');
    const trip3Res = await request({
      method: 'POST',
      path: '/trips',
      headers: { 'x-user-role': 'traveler', 'x-user-id': '1' },
    }, {
      destination: 'Ooty Decline Test',
      startDate: '2026-12-01',
      endDate: '2026-12-05',
      budget: 25000,
      travelerId: 1,
      guideId: 1,
    });
    const trip3 = trip3Res.data;

    // Move to Confirmed
    await request({
      method: 'PATCH',
      path: `/trips/${trip3.tripId}/status`,
      headers: { 'x-user-role': 'traveler', 'x-user-id': '1' },
    }, { status: 'Pending' });
    await request({
      method: 'PATCH',
      path: `/trips/${trip3.tripId}/status`,
      headers: { 'x-user-role': 'traveler', 'x-user-id': '1' },
    }, { status: 'Confirmed' });

    // Guide declines (must NOT force status: 'Planning', which would violate FSM)
    const declineRes = await request({
      method: 'PUT',
      path: `/trips/${trip3.tripId}`,
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    }, {
      guideStatus: 'Declined',
    });
    assert(declineRes.status === 200, 'Guide declines without FSM error');
    assert(declineRes.data.guideStatus === 'Declined', 'guideStatus is recorded as Declined');
    assert(declineRes.data.status === 'Confirmed', 'Trip payment status Confirmed is not overwritten to Planning');

    // -------------------------------------------------------------
    // 4. Reassignment resets guideStatus
    // -------------------------------------------------------------
    console.log('\n--- 4. Guide Reassignment resets guideStatus to "Pending" ---');
    const reassignRes = await request({
      method: 'PUT',
      path: `/trips/${trip3.tripId}`,
      headers: { 'x-user-role': 'admin', 'x-user-id': '1' },
    }, {
      guideId: 2,
    });
    assert(reassignRes.status === 200, 'Admin reassigns trip to Guide #2');
    assert(reassignRes.data.guideId === 2, 'guideId is now 2');
    assert(reassignRes.data.guideStatus === 'Pending', 'guideStatus automatically reset from Declined to Pending');

    // -------------------------------------------------------------
    // 5. Agency-owned trips & businessName consistency
    // -------------------------------------------------------------
    console.log('\n--- 5. Agency-Owned Trips & businessName Consistency ---');
    const agencyTripRes = await request({
      method: 'POST',
      path: '/trips',
      headers: { 'x-user-role': 'agency', 'x-user-id': '1' },
    }, {
      destination: 'Kerala Backwaters Group Tour',
      startDate: '2026-11-20',
      endDate: '2026-11-26',
      budget: 65000,
      agencyId: 1,
      guideId: 1,
    });
    assert(agencyTripRes.status === 201, 'Agency created trip with guideId: 1');
    const agencyTrip = agencyTripRes.data;
    assert(agencyTrip.agencyId === 1, 'Trip is agency-owned (agencyId: 1)');

    // Fetch agency lookup and check businessName
    const lookupRes = await request({
      method: 'GET',
      path: '/agencies/lookup',
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    });
    assert(lookupRes.status === 200, 'GET /agencies/lookup accessible to guide');
    const agency1 = lookupRes.data.find((a) => a.agencyId === 1);
    assert(Boolean(agency1 && agency1.businessName), `Agency #1 has businessName: "${agency1?.businessName}"`);

    // -------------------------------------------------------------
    // 6. Forbidden updates to another guide's trip
    // -------------------------------------------------------------
    console.log("\n--- 6. Forbidden Updates to Another Guide's Trip ---");
    // Trip is assigned to Guide #2 (from step 4). Guide #1 tries to update it.
    const forbiddenRes = await request({
      method: 'PUT',
      path: `/trips/${trip3.tripId}`,
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    }, {
      guideStatus: 'Accepted',
    });
    assert(forbiddenRes.status === 403, 'Guide 1 cannot update Guide 2\'s trip (Returns 403 Forbidden)');

    // Guide 1 also cannot update status of Guide 2's trip
    const forbiddenStatusRes = await request({
      method: 'PATCH',
      path: `/trips/${trip3.tripId}/status`,
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    }, { status: 'Active' });
    assert(forbiddenStatusRes.status === 403, 'Guide 1 cannot update status of Guide 2\'s trip (Returns 403 Forbidden)');

    // -------------------------------------------------------------
    // 7. Traveler -> Guide -> Traveler Messages
    // -------------------------------------------------------------
    console.log('\n--- 7. Traveler -> Guide -> Traveler Messages ---');
    // Traveler sends message to Guide 1
    const trvMsgRes = await request({
      method: 'POST',
      path: '/messages',
      headers: { 'x-user-role': 'traveler', 'x-user-id': '1' },
    }, {
      sender: 'traveler',
      senderId: 1,
      receiver: 'guide',
      receiverId: 1,
      content: 'Hello Guide, what should we wear for the hike?',
    });
    assert(trvMsgRes.status === 201, 'Traveler sent message to Guide 1');

    // Guide 1 replies to Traveler
    const guideMsgRes = await request({
      method: 'POST',
      path: '/messages',
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    }, {
      sender: 'guide',
      senderId: 1,
      receiver: 'traveler',
      receiverId: 1,
      content: 'Sturdy hiking boots and warm layers are recommended!',
    });
    assert(guideMsgRes.status === 201, 'Guide 1 replied to Traveler');

    // Check conversation query
    const convRes = await request({
      method: 'GET',
      path: '/messages/conversation?senderType=guide&senderId=1&receiverType=traveler&receiverId=1',
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    });
    assert(convRes.status === 200, 'Conversation retrieved successfully');
    assert(Array.isArray(convRes.data) && convRes.data.length >= 2, 'Conversation contains both sent and received messages');
    const lastTwo = convRes.data.slice(-2);
    assert(lastTwo.some((m) => m.content.includes('hiking boots')), 'Guide reply message is present in thread');

    // -------------------------------------------------------------
    // 8. Guide Itinerary Changes & Ownership
    // -------------------------------------------------------------
    console.log('\n--- 8. Guide Itinerary Creation, Updates & Ownership ---');
    // Guide 1 creates activity for assigned trip (trip1 is assigned to Guide 1)
    const createItinRes = await request({
      method: 'POST',
      path: '/itineraries',
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    }, {
      tripId: trip1.tripId,
      dayNumber: 1,
      activity: 'Mall Road Evening Walk',
      time: '17:00',
      city: 'Shimla',
      activityStatus: 'Pending',
    });
    assert(createItinRes.status === 201, 'Guide 1 added itinerary activity to assigned trip');
    const itin = createItinRes.data;

    // Guide 1 updates activity status to Confirmed
    const updateItinRes = await request({
      method: 'PUT',
      path: `/itineraries/${itin.itineraryId}`,
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    }, {
      activityStatus: 'Confirmed',
    });
    assert(updateItinRes.status === 200, 'Guide 1 updated itinerary status to Confirmed');
    assert(updateItinRes.data.activityStatus === 'Confirmed', 'Activity status is Confirmed');

    // Guide 1 updates activity status to Completed
    const completeItinRes = await request({
      method: 'PUT',
      path: `/itineraries/${itin.itineraryId}`,
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    }, {
      activityStatus: 'Completed',
    });
    assert(completeItinRes.status === 200, 'Guide 1 updated itinerary status to Completed');
    assert(completeItinRes.data.activityStatus === 'Completed', 'Activity status is Completed');

    // Guide 2 attempts to edit Guide 1's itinerary item -> 403 Forbidden
    const forbiddenItinRes = await request({
      method: 'PUT',
      path: `/itineraries/${itin.itineraryId}`,
      headers: { 'x-user-role': 'guide', 'x-user-id': '2' },
    }, {
      activityStatus: 'Pending',
    });
    assert(forbiddenItinRes.status === 403, 'Guide 2 forbidden from updating Guide 1\'s itinerary (Returns 403)');

    // -------------------------------------------------------------
    // 9. Dashboard Guide Metrics
    // -------------------------------------------------------------
    console.log('\n--- 9. Dashboard Guide Metrics & State Consistency ---');
    const dashRes = await request({
      method: 'GET',
      path: '/dashboard/guide/1',
      headers: { 'x-user-role': 'guide', 'x-user-id': '1' },
    });
    assert(dashRes.status === 200, 'GET /dashboard/guide/1 returned successfully');
    assert(typeof dashRes.data.assignedTripsCount === 'number', 'assignedTripsCount is a number');
    assert(typeof dashRes.data.pendingRequests === 'number', 'pendingRequests is a number');
    assert(typeof dashRes.data.messagesCount === 'number', 'messagesCount is a number');

  } catch (err) {
    console.error('Unexpected error running tests:', err);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
