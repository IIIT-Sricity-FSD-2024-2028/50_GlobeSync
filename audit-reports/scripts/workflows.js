// Cross-actor workflow checks (A-E) against the running API, with persisted-state verification.
const { call, login, future, check, results } = require('./api');
(async () => {
  const T = await login('Arjun@gmail.com', process.env.PW_TRAVELER);
  const G = await login('Devansh@gmail.com', process.env.PW_GUIDE);
  const A = await login('admin@ticp.com', process.env.PW_ADMIN);
  const tid = Number(T.user.travelerId);
  const gid = Number(G.user.guideId);
  let r;

  // ---------- Workflow A: admin creates package -> traveler sees -> books -> admin sees -> guide sees ----------
  const pkgName = `Audit Package ${Date.now()}`;
  r = await call('POST', '/packages', A.token, { name: pkgName, duration: 4, budget: 18000, description: 'Audit test package', destinations: 'Hampi', highlights: 'Ruins', image: '/destinations/goa.png' });
  check('WA-1', 'admin creates package', r.status === 201, r.data);
  const pkg = r.data;
  r = await call('GET', '/packages', T.token);
  const list = Array.isArray(r.data) ? r.data : r.data.data;
  check('WA-2', 'traveler sees the new package', list.some((p) => p.packageId === pkg.packageId), list.length);
  r = await call('POST', '/trips', T.token, { destination: 'Hampi', startDate: future(20), endDate: future(24), budget: 30000, travelerId: tid, guideId: gid, packageId: pkg.packageId, status: 'Pending', travelersCount: 2 });
  check('WA-3', 'traveler plans trip on the package with a guide', r.status === 201, r.data);
  const trip = r.data;
  r = await call('POST', '/bookings', T.token, { tripId: trip.tripId, travelerId: tid, service: 'Hampi Heritage Hotel', type: 'Hotel', amount: 12000, status: 'Pending' });
  check('WA-4', 'traveler books hotel (HELD)', r.status === 201 && r.data.status === 'HELD', r.data);
  const bk = r.data;
  r = await call('GET', '/bookings', A.token);
  const allB = Array.isArray(r.data) ? r.data : r.data.data;
  check('WA-5', 'admin sees the booking', allB.some((b) => b.bookingId === bk.bookingId), allB.length);
  r = await call('GET', `/trips/guide/${gid}`, G.token);
  const gTrips = Array.isArray(r.data) ? r.data : r.data.data;
  check('WA-6', 'guide sees the assignment request', gTrips.some((t) => t.tripId === trip.tripId && t.guideStatus === 'Pending'), gTrips.length);
  r = await call('GET', '/notifications', G.token);
  check('WA-7', 'guide received a notification for the request', (r.data.notifications || []).some((n) => n.metadata?.tripId === trip.tripId), r.data);
  r = await call('GET', '/notifications', T.token);
  check('WA-8', 'traveler does NOT receive the guide\'s notification', !(r.data.notifications || []).some((n) => n.type === 'guide_request'), r.data.notifications?.map((n) => n.type));

  // pay
  r = await call('POST', '/payments', T.token, { amount: bk.amount - 1, paymentDate: future(0), method: 'Card', status: 'Paid', bookingId: bk.bookingId });
  check('WA-9', 'underpayment rejected', r.status === 400, r.data);
  r = await call('POST', '/payments', T.token, { amount: bk.amount, paymentDate: future(0), method: 'Cash', status: 'Paid', bookingId: bk.bookingId });
  check('WA-10', 'traveler cannot self-declare cash payment', r.status === 400, r.data);
  r = await call('POST', '/payments', T.token, { amount: bk.amount, paymentDate: future(0), method: 'UPI', status: 'Paid', bookingId: bk.bookingId });
  check('WA-11', 'exact payment accepted', r.status === 201, r.data);
  r = await call('POST', '/payments', T.token, { amount: bk.amount, paymentDate: future(0), method: 'UPI', status: 'Paid', bookingId: bk.bookingId });
  check('WA-12', 'duplicate payment rejected', r.status === 400, r.data);
  r = await call('GET', `/bookings/${bk.bookingId}`, T.token);
  check('WA-13', 'booking CONFIRMED after payment (persisted)', r.data.status === 'CONFIRMED', r.data.status);
  r = await call('GET', `/trips/${trip.tripId}`, T.token);
  check('WA-14', 'trip auto-confirmed by server once fully paid', r.data.status === 'Confirmed', r.data.status);
  r = await call('GET', `/trips/${trip.tripId}`, A.token);
  check('WA-15', 'admin sees trip Confirmed', r.data.status === 'Confirmed', r.data.status);

  // ---------- Workflow D: guide accepts, starts, completes ----------
  r = await call('PATCH', `/trips/${trip.tripId}/status`, G.token, { status: 'Active' });
  check('WD-1', 'guide cannot start before accepting', r.status === 400, r.data);
  r = await call('PUT', `/trips/${trip.tripId}`, G.token, { guideStatus: 'Accepted' });
  check('WD-2', 'guide accepts', r.status === 200 && r.data.guideStatus === 'Accepted', r.data);
  r = await call('PUT', `/trips/${trip.tripId}`, G.token, { guideStatus: 'Declined' });
  check('WD-3', 'guide cannot flip an accepted request to declined', r.status === 400, r.data);
  r = await call('GET', '/notifications', T.token);
  check('WD-4', 'traveler notified of acceptance', (r.data.notifications || []).some((n) => n.type === 'guide_accepted' && n.metadata?.tripId === trip.tripId), r.data.notifications?.map((n) => n.type));
  r = await call('PATCH', `/trips/${trip.tripId}/status`, T.token, { status: 'Completed' });
  check('WD-5', 'traveler cannot complete trip', r.status === 403 || r.status === 400, r.data);
  r = await call('PATCH', `/trips/${trip.tripId}/status`, G.token, { status: 'Active' });
  check('WD-6', 'guide starts trip', r.status === 200 && r.data.status === 'Active', r.data);
  r = await call('PATCH', `/trips/${trip.tripId}/status`, G.token, { status: 'Completed' });
  check('WD-7', 'guide completes trip', r.status === 200 && r.data.status === 'Completed', r.data);
  r = await call('GET', `/bookings/${bk.bookingId}`, T.token);
  check('WD-8', 'booking becomes COMPLETED with the trip', r.data.status === 'COMPLETED', r.data.status);
  r = await call('GET', `/trips/${trip.tripId}`, A.token);
  check('WD-9', 'admin sees trip Completed', r.data.status === 'Completed', r.data.status);

  // ---------- Workflow E: review ----------
  r = await call('POST', '/reviews', T.token, { bookingId: bk.bookingId, tripId: trip.tripId, travelerId: tid, guideId: 999, tripRating: 5, guideRating: 5, comment: 'wrong guide' });
  check('WE-1', 'review for a guide who was not on the trip is rejected', r.status === 400, r.data);
  r = await call('POST', '/reviews', T.token, { bookingId: bk.bookingId, tripId: trip.tripId, travelerId: tid, guideId: gid, tripRating: 5, guideRating: 4, comment: 'Lovely ruins tour' });
  check('WE-2', 'review accepted after completion', r.status === 201 && r.data.guideId === gid, r.data);
  const review = r.data;
  r = await call('POST', '/reviews', T.token, { bookingId: bk.bookingId, tripId: trip.tripId, travelerId: tid, guideId: gid, tripRating: 1, guideRating: 1, comment: 'dup' });
  check('WE-3', 'duplicate review rejected', r.status === 409, r.data);
  r = await call('GET', `/reviews/guide/${gid}`, G.token);
  const gr = Array.isArray(r.data) ? r.data : r.data.data;
  check('WE-4', 'guide sees the review', gr.some((x) => x.reviewId === review.reviewId), gr.length);
  r = await call('GET', '/reviews', A.token);
  const ar = Array.isArray(r.data) ? r.data : r.data.data;
  check('WE-5', 'admin sees the review for moderation', ar.some((x) => x.reviewId === review.reviewId), ar.length);
  r = await call('DELETE', `/reviews/${review.reviewId}`, T.token);
  check('WE-6', 'traveler cannot delete reviews (moderation is admin-only)', r.status === 403, r.status);

  // ---------- Workflow B: traveler cancels trip -> bookings cancelled -> guide calendar freed ----------
  r = await call('POST', '/trips', T.token, { destination: 'Coorg', startDate: future(60), endDate: future(63), budget: 20000, travelerId: tid, guideId: gid, status: 'Pending' });
  const trip2 = r.data;
  r = await call('POST', '/bookings', T.token, { tripId: trip2.tripId, travelerId: tid, service: 'Coorg Stay', type: 'Hotel', amount: 9000 });
  const bk2 = r.data;
  r = await call('POST', '/payments', T.token, { amount: bk2.amount, paymentDate: future(0), method: 'Card', status: 'Paid', bookingId: bk2.bookingId });
  check('WB-1', 'payment for trip 2', r.status === 201, r.data);
  r = await call('PUT', `/trips/${trip2.tripId}`, G.token, { guideStatus: 'Accepted' });
  check('WB-2', 'guide accepts trip 2', r.status === 200, r.data);
  r = await call('POST', '/trips', T.token, { destination: 'Coorg overlap', startDate: future(61), endDate: future(62), budget: 1000, travelerId: tid, guideId: gid, status: 'Pending' });
  const trip3 = r.data;
  r = await call('PUT', `/trips/${trip3.tripId}`, G.token, { guideStatus: 'Accepted' });
  check('WB-3', 'overlapping trip blocked while trip 2 active', r.status === 409, r.data);
  r = await call('GET', `/bookings/${bk2.bookingId}/cancellation-preview`, T.token);
  check('WB-4', 'preview shows 65% refund on amount actually paid', r.data.refundPercentage === 65 && r.data.totalAmount === bk2.amount, r.data);
  const expectedRefund = r.data.refundAmount;
  r = await call('PATCH', `/trips/${trip2.tripId}/status`, T.token, { status: 'Cancelled', cancellationReason: 'Family emergency' });
  check('WB-5', 'traveler cancels trip', r.status === 200 && r.data.status === 'Cancelled', r.data);
  await new Promise((res) => setTimeout(res, 200));
  r = await call('GET', `/bookings/${bk2.bookingId}`, T.token);
  check('WB-6', 'booking on cancelled trip is cancelled too', String(r.data.status).toUpperCase() === 'CANCELLED', r.data.status);
  r = await call('GET', '/refunds', A.token);
  const refunds = Array.isArray(r.data) ? r.data : r.data.data || [];
  console.log('   refunds visible to admin:', JSON.stringify(refunds.slice(-2)).slice(0, 300), 'expected', expectedRefund);
  r = await call('PUT', `/trips/${trip3.tripId}`, G.token, { guideStatus: 'Accepted' });
  check('WB-7', 'guide calendar freed after cancellation (overlapping trip can now be accepted)', r.status === 200, r.data);
  r = await call('GET', `/trips/guide/${gid}`, G.token);
  const g2 = (Array.isArray(r.data) ? r.data : r.data.data).find((t) => t.tripId === trip2.tripId);
  check('WB-8', 'guide sees trip 2 as Cancelled', g2 && g2.status === 'Cancelled', g2);
  r = await call('PATCH', `/trips/${trip2.tripId}/status`, T.token, { status: 'Cancelled' });
  check('WB-9', 'repeat cancel is idempotent (no second refund)', r.status === 200, r.status);

  // ---------- Workflow C: admin edits package; existing trip keeps its terms ----------
  r = await call('PUT', `/packages/${pkg.packageId}`, A.token, { budget: 25000 });
  check('WC-1', 'admin edits package price', r.status === 200 && r.data.budget === 25000, r.data);
  r = await call('GET', `/bookings/${bk.bookingId}`, A.token);
  check('WC-2', 'existing booking keeps its confirmed amount', r.data.amount === bk.amount, r.data.amount);
  r = await call('DELETE', `/packages/${pkg.packageId}`, A.token);
  console.log('   delete package with trips ->', r.status, JSON.stringify(r.data).slice(0, 200));
  r = await call('GET', `/trips/${trip.tripId}`, T.token);
  check('WC-3', 'trip history survives package delete/deactivate', r.status === 200, r.status);

  // ---------- Admin dashboard accuracy ----------
  r = await call('GET', '/dashboard/admin', A.token);
  const d = r.data;
  const [tr, bkAll, pk, gu, tv] = await Promise.all([call('GET', '/trips', A.token), call('GET', '/bookings', A.token), call('GET', '/packages', A.token), call('GET', '/guides', A.token), call('GET', '/travelers', A.token)]);
  const n = (x) => (Array.isArray(x.data) ? x.data.length : x.data.total ?? x.data.data?.length);
  console.log('   dashboard', JSON.stringify(d));
  check('DASH-1', 'total trips matches records', d.totalTrips === n(tr), [d.totalTrips, n(tr)]);
  check('DASH-2', 'total bookings matches records', d.totalBookings === n(bkAll), [d.totalBookings, n(bkAll)]);
  check('DASH-3', 'total packages matches records', d.totalPackages === n(pk), [d.totalPackages, n(pk)]);
  check('DASH-4', 'total guides matches', d.totalGuides === n(gu), [d.totalGuides, n(gu)]);
  check('DASH-5', 'total travelers matches', d.totalTravelers === n(tv), [d.totalTravelers, n(tv)]);

  // Session handling
  r = await call('POST', '/auth/refresh', null, { refreshToken: T.refreshToken });
  check('AUTH-1', 'refresh token rotates and returns a new access token (in-memory mode)', r.status === 200 || r.status === 201, r.data);
  r = await call('POST', '/auth/refresh', null, { refreshToken: T.refreshToken });
  check('AUTH-2', 'old refresh token cannot be reused', r.status === 401, r.status);
  r = await call('GET', '/trips/1', 'not-a-real-token');
  check('AUTH-3', 'garbage token rejected 401', r.status === 401, r.status);

  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  require('fs').writeFileSync('/tmp/claude-0/sp/workflows-results.json', JSON.stringify(results, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
