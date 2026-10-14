/**
 * verify_traveler_e2e_recovery.js
 *
 * End-to-end API test verifying traveler payment, duplicate prevention,
 * recovery, and trip status transition rules on the live NestJS backend.
 */

const BASE = 'http://localhost:3000';

const TRAVELER1_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-role': 'traveler',
  'x-user-id': '1',
};

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function get(path, headers = TRAVELER1_HEADERS) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function post(path, body, headers = TRAVELER1_HEADERS) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function put(path, body, headers = TRAVELER1_HEADERS) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function patch(path, body, headers = TRAVELER1_HEADERS) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('\n======================================================');
  console.log('Traveler End-to-End API Integration Verification');
  console.log('======================================================\n');

  // 1. Normal Payment Flow
  let tripId = null;
  let bookingId = null;

  await runTest('Normal Payment Flow: Create Trip, Booking, and Pay', async () => {
    // Create Trip
    const tripRes = await post('/trips', {
      destination: 'Rome, Italy',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      budget: 50000,
      travelerId: 1,
      status: 'Pending',
    });
    assert(tripRes.ok, `Failed to create trip: ${JSON.stringify(tripRes.data)}`);
    tripId = tripRes.data.tripId;
    assert(tripRes.data.status === 'Pending', 'Trip should be Pending');

    // Create Booking
    const bookingRes = await post('/bookings', {
      bookingDate: '2026-10-14',
      tripId,
      travelerId: 1,
      service: 'Rome Express Flight',
      type: 'Flight',
      amount: 15000,
      status: 'Pending',
      insuranceSelected: true,
      transportMode: 'Flight',
      cancellationProtectionSelected: true,
    });
    assert(bookingRes.ok, `Failed to create booking: ${JSON.stringify(bookingRes.data)}`);
    bookingId = bookingRes.data.bookingId;
    assert(bookingRes.data.status === 'Pending', 'Booking should be Pending');

    // Create Payment
    const paymentRes = await post('/payments', {
      amount: 15000,
      paymentDate: '2026-10-14',
      method: 'Card',
      status: 'Paid',
      bookingId,
    });
    assert(paymentRes.ok, `Failed to create payment: ${JSON.stringify(paymentRes.data)}`);
    assert(paymentRes.data.status === 'Paid', 'Payment status should be Paid');

    // Update Booking to Confirmed
    const confirmBookingRes = await put(`/bookings/${bookingId}`, {
      bookingDate: '2026-10-14',
      tripId,
      travelerId: 1,
      service: 'Rome Express Flight',
      type: 'Flight',
      amount: 15000,
      status: 'Confirmed',
      cancellationProtectionSelected: true,
      cancellationFee: 100,
    });
    assert(confirmBookingRes.ok, `Failed to confirm booking: ${JSON.stringify(confirmBookingRes.data)}`);
    assert(confirmBookingRes.data.status === 'Confirmed', 'Booking should be Confirmed');

    // Transition Trip to Confirmed (Pending -> Confirmed)
    const confirmTripRes = await patch(`/trips/${tripId}/status`, { status: 'Confirmed' });
    assert(confirmTripRes.ok, `Failed to confirm trip: ${JSON.stringify(confirmTripRes.data)}`);
    assert(confirmTripRes.data.status === 'Confirmed', 'Trip should be Confirmed');
  });

  // 2. Repeat Payment Prevention & Recovery
  await runTest('Repeat Payment Prevention: Backend duplicate check rejects repeat payment', async () => {
    // Attempting to create another payment for bookingId must fail or trigger recovery
    const repeatRes = await post('/payments', {
      amount: 15000,
      paymentDate: '2026-10-14',
      method: 'Card',
      status: 'Paid',
      bookingId,
    });

    assert(
      !repeatRes.ok || repeatRes.data.status === 400 || (repeatRes.data.message && repeatRes.data.message.includes('already')),
      'Repeat payment must be rejected or duplicate detected',
    );

    // Verify recovery lookup: get payments for booking
    const getPaymentsRes = await get(`/payments/booking/${bookingId}`);
    assert(getPaymentsRes.ok, 'Failed to get payments by booking');
    const paidTxs = getPaymentsRes.data.filter((p) => p.status === 'Paid');
    assert(paidTxs.length === 1, `Expected exactly 1 Paid record, found ${paidTxs.length}`);
    assert(paidTxs[0].amount === 15000, 'Recovered amount must match original amount');
  });

  // 3. Trip Status Transition Rules
  await runTest('Trip FSM Rules: Planning directly to Confirmed rejected; Planning -> Pending -> Confirmed succeeds', async () => {
    // Create Trip in Planning status
    const planTripRes = await post('/trips', {
      destination: 'Kyoto, Japan',
      startDate: '2026-12-01',
      endDate: '2026-12-07',
      budget: 60000,
      travelerId: 1,
      status: 'Planning',
    });
    assert(planTripRes.ok, 'Failed to create planning trip');
    const pTripId = planTripRes.data.tripId;
    assert(planTripRes.data.status === 'Planning', 'Status should be Planning');

    // Direct jump from Planning to Confirmed must be rejected with 400
    const badJump = await patch(`/trips/${pTripId}/status`, { status: 'Confirmed' });
    assert(badJump.status === 400, 'Direct transition from Planning to Confirmed must return 400 Bad Request');
    assert(badJump.data.message.includes('Invalid status transition'), 'Error message must explain transition rule');

    // Proper FSM: Planning -> Pending
    const step1 = await patch(`/trips/${pTripId}/status`, { status: 'Pending' });
    assert(step1.ok && step1.data.status === 'Pending', 'Transition to Pending should succeed');

    // Then Pending -> Confirmed
    const step2 = await patch(`/trips/${pTripId}/status`, { status: 'Confirmed' });
    assert(step2.ok && step2.data.status === 'Confirmed', 'Transition to Confirmed should succeed');
  });

  // 4. Guide Status Separation
  await runTest('Guide Status Separation: Trip status updates do not alter guideStatus', async () => {
    // Create Trip with Guide
    const guideTrip = await post('/trips', {
      destination: 'Swiss Alps',
      startDate: '2026-12-10',
      endDate: '2026-12-16',
      budget: 70000,
      travelerId: 1,
      guideId: 1,
      status: 'Pending',
    });
    assert(guideTrip.ok, 'Failed to create trip with guide');
    const gTripId = guideTrip.data.tripId;
    assert(guideTrip.data.guideStatus === 'Pending', 'guideStatus should be initialized to Pending');

    // Transition trip status to Confirmed
    const tripConfirmed = await patch(`/trips/${gTripId}/status`, { status: 'Confirmed' });
    assert(tripConfirmed.ok, 'Trip status update failed');
    assert(tripConfirmed.data.status === 'Confirmed', 'Trip status should be Confirmed');
    assert(tripConfirmed.data.guideStatus === 'Pending', 'guideStatus must remain Pending and separate from trip status');
  });

  console.log(`\n======================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

main();
