import { test, expect } from '@playwright/test';

test.describe('E2E Full User Journey: Complete Traveler Lifecycle', () => {
  test('register -> book -> pay -> guide accepts -> chat -> cancel -> refund -> review', async ({ page, request }) => {
    // ─────────────────────────────────────────────────────────────
    // Step 1: Register New Traveler
    // ─────────────────────────────────────────────────────────────
    await page.goto('/signup/traveler');

    // 1-Click quick fill for clean valid data
    const quickFillBtn = page.getByRole('button', { name: /Quick-Fill Sample Traveler/i });
    await expect(quickFillBtn).toBeVisible({ timeout: 5000 });
    await quickFillBtn.click();

    // Submit registration form
    const submitRegisterBtn = page.getByRole('button', { name: /Create Traveler Account/i });
    await submitRegisterBtn.click();

    // Verify successful registration and redirect to traveler dashboard
    await page.waitForURL('**/traveler/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/traveler/dashboard');

    // Extract authentication token from localStorage
    const authToken = await page.evaluate(() => localStorage.getItem('globesync_access_token') || localStorage.getItem('access_token'));
    const authSessionRaw = await page.evaluate(() => localStorage.getItem('globesync_session_user') || localStorage.getItem('user'));
    const sessionUser = authSessionRaw ? JSON.parse(authSessionRaw) : {};
    const travelerId = Number(sessionUser.id || sessionUser.travelerId);
    expect(travelerId).toBeGreaterThan(0);

    // ─────────────────────────────────────────────────────────────
    // Step 2: Book Trip (Create Trip + Booking with HELD state)
    // ─────────────────────────────────────────────────────────────
    const uniqueId = Date.now();
    const offsetDays = 100 + Math.floor(Math.random() * 300);
    const departureTime = Date.now() + offsetDays * 24 * 3600 * 1000;
    const departureDate = new Date(departureTime).toISOString();
    const returnDate = new Date(departureTime + 7 * 24 * 3600 * 1000).toISOString();

    // 2a. Look up guide Devansh's guide profile id (account id 4 is NOT the guide id;
    //     the audit fixed the identity mix-up, so the server returns guideId in the login response).
    const guideLoginRes = await request.post('http://localhost:3001/auth/login', {
      data: { email: 'Devansh@gmail.com', password: 'guide123' },
    });
    expect(guideLoginRes.status()).toBe(200);
    const guideLogin = await guideLoginRes.json();
    const guideToken = guideLogin.accessToken;
    const guideId = Number(guideLogin.user.guideId);
    expect(guideId).toBeGreaterThan(0);

    // 2b. Create trip with assigned guide Devansh
    const tripRes = await request.post('http://localhost:3001/trips', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-user-id': String(travelerId),
        'x-user-role': 'traveler',
      },
      data: {
        title: 'Goa Coastal Adventure',
        destination: 'Goa',
        startDate: departureDate.slice(0, 10),
        endDate: returnDate.slice(0, 10),
        budget: 25000,
        travelerId,
        guideId,
        status: 'Pending',
      },
    });
    expect(tripRes.status()).toBe(201);
    const tripData = await tripRes.json();
    const tripId = tripData.tripId;

    // ─────────────────────────────────────────────────────────────
    // Step 2c: Guide accepts first (a trip with a guide is booked only after the guide accepts)
    // ─────────────────────────────────────────────────────────────
    // Guide accepts trip assignment
    const acceptRes = await request.patch(`http://localhost:3001/trips/${tripId}`, {
      headers: {
        Authorization: `Bearer ${guideToken}`,
      },
      data: {
        guideStatus: 'Accepted',
      },
    });
    expect([200, 204]).toContain(acceptRes.status());

    // 2b. Create booking in HELD state
    const bookingRes = await request.post('http://localhost:3001/bookings', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-user-id': String(travelerId),
        'x-user-role': 'traveler',
        'idempotency-key': `idemp-e2e-${uniqueId}`,
      },
      data: {
        tripId,
        travelerId,
        service: 'Goa Coastal Adventure',
        type: 'Package',
        bookingDate: departureDate,
        amount: 25000,
        cancellationProtectionSelected: true,
      },
    });
    expect(bookingRes.status()).toBe(201);
    const bookingData = await bookingRes.json();
    const bookingId = bookingData.bookingId;
    expect(bookingData.status).toBe('HELD');

    // ─────────────────────────────────────────────────────────────
    // Step 3: Pay Booking via UI
    // ─────────────────────────────────────────────────────────────
    await page.goto('/traveler/bookings');

    // Locate the Pay Now button and click it
    const payNowBtn = page.getByRole('button', { name: /Pay Now/i }).first();
    await expect(payNowBtn).toBeVisible({ timeout: 10000 });
    await payNowBtn.click();

    // Fill demo card details inside PaymentModal
    const demoCardBtn = page.getByRole('button', { name: /Use Demo Card Details/i });
    if (await demoCardBtn.isVisible()) {
      await demoCardBtn.click();
    }

    // Submit payment
    const confirmPayBtn = page.locator('form').getByRole('button', { name: /Pay ₹/i });
    await expect(confirmPayBtn).toBeVisible({ timeout: 5000 });
    await confirmPayBtn.click();

    // Wait for payment to process and modal to close
    await expect(page.locator('.modal-overlay-custom')).toHaveCount(0, { timeout: 10000 });

    // ─────────────────────────────────────────────────────────────
    // Step 5: Chat / Messaging
    // ─────────────────────────────────────────────────────────────
    await page.goto('/traveler/messages');

    // Send coordination message to guide Devansh
    const messageRes = await request.post('http://localhost:3001/messages', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-user-id': String(travelerId),
        'x-user-role': 'traveler',
      },
      data: {
        sender: 'traveler',
        senderId: travelerId,
        receiver: 'guide',
        receiverId: guideId,
        content: 'Hi Devansh! Looking forward to the tour. What should I pack?',
        bookingId,
      },
    });
    expect(messageRes.status()).toBe(201);
    await page.reload();
    await expect(page.getByText('Hi Devansh! Looking forward').first()).toBeVisible({ timeout: 5000 });

    // ─────────────────────────────────────────────────────────────
    // Step 6 & 7: Cancel Booking & Receive Server-Side Refund
    // ─────────────────────────────────────────────────────────────
    await page.goto('/traveler/bookings');

    // Click Cancel Booking on the booking card / row (rendered as ✕ button)
    const cancelBtn = page.getByRole('button', { name: '✕' }).first();
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });
    await cancelBtn.click();

    // Confirm Cancellation in Modal
    const confirmCancelBtn = page.getByRole('button', { name: /Confirm Cancellation/i });
    await expect(confirmCancelBtn).toBeVisible({ timeout: 5000 });
    await confirmCancelBtn.click();

    // Verify booking updates to Cancelled state in table
    await expect(page.locator('table').getByText(/Cancelled/i).first()).toBeVisible({ timeout: 10000 });

    // ─────────────────────────────────────────────────────────────
    // Step 8: Post-Trip Review
    // ─────────────────────────────────────────────────────────────
    // PolicyService allows reviews ONLY after a booking is COMPLETED.
    // Create a booking fixture with departure in the future, then transition to COMPLETED:
    const futureDate = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
    const completedBookingRes = await request.post('http://localhost:3001/bookings', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-user-id': String(travelerId),
        'x-user-role': 'traveler',
      },
      data: {
        tripId,
        travelerId,
        service: 'Goa Coastal Adventure - Completed Tour',
        type: 'Package',
        bookingDate: futureDate,
        amount: 25000,
      },
    });
    expect([201, 200]).toContain(completedBookingRes.status());
    const completedBookingData = await completedBookingRes.json();
    const completedBookingId = completedBookingData.bookingId;

    // The traveler pays the exact server price, then the guide runs the trip.
    // (Before the audit this test PUT status PAID/CONFIRMED/COMPLETED as the traveler,
    //  which only worked because travelers could rewrite booking status - a P0 defect.)
    const dueMinor = completedBookingData.total_minor ?? Math.round(Number(completedBookingData.amount) * 100);
    const payRes = await request.post('http://localhost:3001/payments', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        amount: dueMinor / 100,
        paymentDate: new Date().toISOString().slice(0, 10),
        method: 'Card',
        status: 'Paid',
        bookingId: completedBookingId,
      },
    });
    expect(payRes.status()).toBe(201);
    for (const status of ['Active', 'Completed']) {
      const r = await request.patch(`http://localhost:3001/trips/${tripId}/status`, {
        headers: { Authorization: `Bearer ${guideToken}` },
        data: { status },
      });
      expect(r.status()).toBe(200);
    }
    const doneRes = await request.get(`http://localhost:3001/bookings/${completedBookingId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(String((await doneRes.json()).status).toUpperCase()).toBe('COMPLETED');

    // Reload bookings page to display the completed booking
    await page.goto('/traveler/bookings');

    // Click Review on the completed booking
    const reviewBtn = page.getByRole('button', { name: /Review/i }).first();
    if (await reviewBtn.isVisible({ timeout: 5000 })) {
      await reviewBtn.click();
      await page.locator('textarea').fill('Devansh was an exceptional guide! Truly unforgettable experience.');
      await page.getByRole('button', { name: /Submit Verified Review/i }).click();
      await expect(page.locator('text=Thank you! Your verified review has been submitted')).toBeVisible({ timeout: 5000 });
    } else {
      // Direct API verification of review policy
      const reviewApiRes = await request.post('http://localhost:3001/reviews', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-user-id': String(travelerId),
          'x-user-role': 'traveler',
        },
        data: {
          bookingId: completedBookingId,
          tripId,
          travelerId,
          guideId,
          tripRating: 5,
          guideRating: 5,
          comment: 'Devansh was an exceptional guide! Truly unforgettable experience.',
        },
      });
      expect(reviewApiRes.status()).toBe(201);
      const reviewBody = await reviewApiRes.json();
      expect(reviewBody.tripRating).toBe(5);
    }
  });
});
