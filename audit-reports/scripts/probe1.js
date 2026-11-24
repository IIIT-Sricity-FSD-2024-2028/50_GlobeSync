// Probe: verify suspected business-rule defects against the running API (no fixes assumed).
const { call, login, future, check } = require('./api');
(async () => {
  const T = await login('Arjun@gmail.com', process.env.PW_TRAVELER);
  const G = await login('Devansh@gmail.com', process.env.PW_GUIDE);
  const A = await login('admin@ticp.com', process.env.PW_ADMIN);
  const tid = Number(T.user.travelerId);
  const gid = Number(G.user.guideId);
  console.log('ids', tid, gid);

  // P1: price tampering on payment
  let r = await call('POST', '/trips', T.token, { destination: 'Goa', startDate: future(30), endDate: future(34), budget: 50000, travelerId: tid, guideId: gid, status: 'Pending' });
  check('P-trip', 'traveler creates trip', r.status === 201, r);
  const trip = r.data;
  r = await call('POST', '/bookings', T.token, { tripId: trip.tripId, travelerId: tid, service: 'IndiGo 6E', type: 'Flight', amount: 20000, status: 'Pending', transportMode: 'Flight' });
  check('P-book', 'traveler creates booking', r.status === 201, r);
  const bk = r.data;
  console.log('booking amount', bk.amount, bk.status);
  r = await call('POST', '/payments', T.token, { amount: 1, paymentDate: future(0), method: 'Card', status: 'Paid', bookingId: bk.bookingId });
  check('DEF-PAY-UNDERPAY', 'server rejects payment of Rs 1 for a Rs 21,400 booking', r.status >= 400, r);
  r = await call('GET', `/bookings/${bk.bookingId}`, T.token);
  console.log('after pay: status', r.data.status, 'amount', r.data.amount);
  r = await call('PUT', `/bookings/${bk.bookingId}`, T.token, { amount: 1 });
  check('DEF-BOOK-AMOUNT', 'traveler cannot rewrite booking amount', r.status >= 400 || r.data.amount !== 1, r.data);

  // Trip confirmation without payment
  r = await call('POST', '/trips', T.token, { destination: 'Kerala', startDate: future(40), endDate: future(44), budget: 60000, travelerId: tid, status: 'Pending' });
  const trip2 = r.data;
  r = await call('PATCH', `/trips/${trip2.tripId}/status`, T.token, { status: 'Confirmed' });
  check('DEF-TRIP-SELFCONFIRM', 'traveler cannot confirm an unpaid trip', r.status >= 400, r.data);
  r = await call('PATCH', `/trips/${trip2.tripId}/status`, T.token, { status: 'Active' });
  r = await call('PATCH', `/trips/${trip2.tripId}/status`, T.token, { status: 'Completed' });
  check('DEF-TRIP-SELFCOMPLETE', 'traveler cannot mark own trip Completed', r.status >= 400, r.data);

  // Traveler self-accepts on behalf of guide
  r = await call('POST', '/trips', T.token, { destination: 'Jaipur', startDate: future(50), endDate: future(53), budget: 30000, travelerId: tid, guideId: gid, status: 'Pending' });
  const trip3 = r.data;
  r = await call('PUT', `/trips/${trip3.tripId}`, T.token, { guideStatus: 'Accepted' });
  check('DEF-TRIP-SELFACCEPT', 'traveler cannot accept the guide request themselves', r.status >= 400 || r.data.guideStatus !== 'Accepted', r.data);
  r = await call('PUT', `/trips/${trip3.tripId}`, T.token, { travelerId: 99 });
  check('DEF-TRIP-REASSIGN', 'traveler cannot move trip to another traveler', r.status >= 400 || r.data.travelerId !== 99, r.data);

  // Guide edits money fields
  r = await call('PUT', `/trips/${trip.tripId}`, G.token, { budget: 1 });
  check('DEF-GUIDE-BUDGET', 'guide cannot change trip budget', r.status >= 400 || r.data.budget !== 1, r.data);

  // Guide accept + conflicting assignment
  r = await call('PUT', `/trips/${trip.tripId}`, G.token, { guideStatus: 'Accepted' });
  check('G-accept', 'guide accepts trip', r.status === 200 && r.data.guideStatus === 'Accepted', r.data);
  r = await call('POST', '/trips', T.token, { destination: 'Goa2', startDate: future(31), endDate: future(33), budget: 10000, travelerId: tid, guideId: gid, status: 'Pending' });
  const tripOverlap = r.data;
  r = await call('PUT', `/trips/${tripOverlap.tripId}`, G.token, { guideStatus: 'Accepted' });
  check('G-overlap', 'guide cannot accept an overlapping trip', r.status === 409, r.data);

  // Past / invalid dates
  r = await call('POST', '/trips', T.token, { destination: 'Past', startDate: future(-3), endDate: future(-1), budget: 100, travelerId: tid });
  check('V-past', 'past start date rejected', r.status === 400, r.data);
  r = await call('POST', '/trips', T.token, { destination: 'Inv', startDate: future(10), endDate: future(9), budget: 100, travelerId: tid });
  check('V-order', 'end before start rejected', r.status === 400, r.data);
  r = await call('POST', '/trips', T.token, { destination: 'Inv', startDate: 'not-a-date', endDate: 'zzz', budget: 100, travelerId: tid });
  check('V-garbage', 'non-date strings rejected', r.status === 400, r.data);
  r = await call('POST', '/trips', T.token, { destination: 'Zero', startDate: future(10), endDate: future(12), budget: 100, travelerId: tid, travelersCount: 0 });
  check('V-zero', 'zero travelers rejected', r.status === 400 || (r.data && r.data.travelersCount >= 1), r.data);
  r = await call('POST', '/trips', T.token, { destination: 'Neg', startDate: future(10), endDate: future(12), budget: 100, travelerId: tid, travelersCount: -2 });
  check('V-neg', 'negative travelers rejected', r.status === 400, r.data);
  r = await call('POST', '/trips', T.token, { destination: 'Pkg', startDate: future(10), endDate: future(12), budget: 100, travelerId: tid, packageId: 9999 });
  check('V-pkg', 'unknown package id rejected', r.status === 400 || r.status === 404, r.data);
  r = await call('POST', '/trips', T.token, { destination: 'G', startDate: future(10), endDate: future(12), budget: 100, travelerId: tid, guideId: 9999 });
  check('V-guide', 'unknown guide id rejected', r.status === 400 || r.status === 404, r.data);

  // Booking for another traveler's trip
  r = await call('POST', '/auth/register/traveler', null, { email: `t${Date.now()}@example.com`, password: 'Secret123', name: 'Second Traveler' });
  check('REG', 'register second traveler', r.status === 201, r.data);
  const T2 = await login(r.data.email, 'Secret123');
  const t2id = Number(T2.user.travelerId);
  r = await call('GET', `/trips/${trip.tripId}`, T2.token);
  check('IDOR-trip', 'traveler B cannot read traveler A trip', r.status === 403, r.status);
  r = await call('GET', `/bookings/${bk.bookingId}`, T2.token);
  check('IDOR-booking', 'traveler B cannot read traveler A booking', r.status === 403, r.status);
  r = await call('POST', '/bookings', T2.token, { tripId: trip.tripId, travelerId: t2id, service: 'X', type: 'Hotel', amount: 10 });
  check('IDOR-book-on-other-trip', 'traveler B cannot attach a booking to traveler A trip', r.status >= 400, r.data);
  r = await call('POST', `/bookings/${bk.bookingId}/cancel`, T2.token, { reason: 'x' });
  check('IDOR-cancel', 'traveler B cannot cancel traveler A booking', r.status === 403, r.data);
  r = await call('GET', `/bookings/${bk.bookingId}/cancellation-preview`, T2.token);
  check('IDOR-preview', 'traveler B cannot preview traveler A cancellation', r.status === 403, r.status);
  r = await call('GET', `/payments/booking/${bk.bookingId}`, T2.token);
  check('IDOR-pay', 'traveler B cannot read traveler A payments', r.status === 403, r.status);
  r = await call('GET', `/itineraries/trip/${trip.tripId}`, T2.token);
  check('IDOR-itin', 'traveler B cannot read traveler A itinerary', r.status === 403, r.status);
  r = await call('GET', `/expenses/trip/${trip.tripId}`, T2.token);
  check('IDOR-exp', 'traveler B cannot read traveler A expenses', r.status === 403, r.status);
  r = await call('GET', `/messages/user/traveler/${tid}`, T2.token);
  check('IDOR-msg', 'traveler B cannot read traveler A messages', r.status === 403, r.status);
  r = await call('GET', `/dashboard/traveler/${tid}`, T2.token);
  check('IDOR-dash', 'traveler B cannot read traveler A dashboard', r.status === 403, r.status);
  r = await call('GET', `/reviews/trip/${trip.tripId}`, T2.token);
  console.log('reviews by trip for other traveler', r.status);

  // Role escalation
  r = await call('POST', '/packages', T.token, { name: 'Hack', duration: 1, budget: 1, description: 'x', destinations: 'x', highlights: 'x', image: '' });
  check('RBAC-pkg', 'traveler cannot create package', r.status === 403, r.status);
  r = await call('GET', '/bookings', G.token);
  check('RBAC-guide-allbookings', 'guide cannot list ALL bookings platform-wide', r.status === 403, { status: r.status, n: Array.isArray(r.data) ? r.data.length : r.data });
  r = await call('GET', '/travelers', G.token);
  check('RBAC-guide-alltravelers', 'guide cannot list ALL travelers (PII)', r.status === 403, { status: r.status });
  r = await call('PATCH', `/admins/guides/${gid}/verify`, G.token, { verified: true });
  check('RBAC-guide-verify-self', 'guide cannot verify themselves', r.status === 403, r.status);

  // Cancellation
  r = await call('GET', `/bookings/${bk.bookingId}/cancellation-preview`, T.token);
  console.log('preview', JSON.stringify(r.data).slice(0, 300));
  r = await call('POST', `/bookings/${bk.bookingId}/cancel`, T.token, { reason: 'Plans changed' });
  check('C-cancel', 'traveler cancels booking', r.status === 200 || r.status === 201, r.data);
  r = await call('POST', `/bookings/${bk.bookingId}/cancel`, T.token, { reason: 'again' });
  check('C-cancel-twice', 'second cancellation rejected', r.status === 409, r.status);
  r = await call('GET', `/trips/${trip.tripId}`, T.token);
  console.log('trip after its only booking cancelled:', r.data.status, r.data.guideStatus);

  // Reviews
  r = await call('POST', '/reviews', T.token, { tripId: trip3.tripId, travelerId: tid, guideId: gid, rating: 5, comment: 'great' });
  check('R-early', 'review rejected for trip that has not happened', r.status >= 400, r.data);
  r = await call('POST', '/reviews', T.token, { tripId: trip2.tripId, travelerId: tid, guideId: gid, rating: 5, comment: 'self-completed trip' });
  check('R-unpaid', 'review rejected for unpaid self-completed trip (no guide)', r.status >= 400, r.data);

  // Admin
  r = await call('GET', '/dashboard/admin', A.token);
  console.log('admin dashboard', JSON.stringify(r.data).slice(0, 600));
})().catch((e) => { console.error(e); process.exit(1); });
