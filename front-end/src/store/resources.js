import {
  agenciesApi, agencyApi, bookingsApi, dashboardApi, expensesApi, guidesApi, itinerariesApi, messagesApi,
  packagesApi, passengersApi, paymentsApi, refundsApi, reviewsApi, supportTicketsApi,
  travelersApi, tripsApi, adminsApi, approvalsApi, dashboardApi as dashboardEndpoints, revenueApi,
  systemConfigApi, superUsersApi, supportUsersApi, healthApi,
} from '../services/api';
import { createResourceSlice } from './createResourceSlice';

const scoped = (api, method = 'getAll') => (args, options) => {
  const { scope, id, ...rest } = args || {};
  if (scope && typeof api[scope] === 'function') return api[scope](id, options);
  return api[method](options, rest);
};

export const travelers = createResourceSlice({ name: 'travelers', api: travelersApi, idKey: 'travelerId', list: scoped(travelersApi) });
export const agencies = createResourceSlice({ name: 'agencies', api: agenciesApi, idKey: 'agencyId', list: scoped(agenciesApi), operations: {
  updateStatus: (id, payload, options) => agenciesApi.updateStatus(id, payload, options),
  getDetails: (id, options) => agenciesApi.getById(id, options),
  saveAgency: async (id, profile, statusPayload, options) => {
    const updated = await agenciesApi.update(id, profile, options);
    if (statusPayload) await agenciesApi.updateStatus(id, statusPayload, options);
    return updated;
  },
  createApproval: (payload, options) => approvalsApi.create(payload, options),
} });
export const passengers = createResourceSlice({ name: 'passengers', api: passengersApi, idKey: ['passId', 'passengerId'], list: scoped(passengersApi) });
export const packages = createResourceSlice({ name: 'packages', api: packagesApi, idKey: 'packageId', list: scoped(packagesApi), operations: {
  archive: (id, payload, options) => packagesApi.archive(id, payload, options),
} });
export const trips = createResourceSlice({ name: 'trips', api: tripsApi, idKey: 'tripId', list: scoped(tripsApi), operations: {
  updateStatus: (id, status, options) => tripsApi.updateStatus(id, status, options),
  requestReassignment: (id, payload, options) => tripsApi.requestReassignment(id, payload, options),
  respondTravelerConsent: (id, payload, options) => tripsApi.respondTravelerConsent(id, payload, options),
  respondGuideAssignment: (id, payload, options) => tripsApi.respondGuideAssignment(id, payload, options),
  getMyReassignments: (_payload, options) => tripsApi.getMyReassignments(options),
} });
export const itineraries = createResourceSlice({ name: 'itineraries', api: itinerariesApi, idKey: 'itineraryId', list: (args, options) => itinerariesApi.getByTrip(args.tripId, options) });
export const bookings = createResourceSlice({ name: 'bookings', api: bookingsApi, idKey: 'bookingId', list: scoped(bookingsApi), operations: {
  cancel: (id, reason, options) => bookingsApi.cancel(id, reason, options),
  cancellationPreview: (id, options) => bookingsApi.cancellationPreview(id, options),
} });
export const expenses = createResourceSlice({ name: 'expenses', api: expensesApi, idKey: 'expenseId', list: (args, options) => expensesApi.getByTrip(args.tripId, options), operations: {
  loadByTrips: async (tripIds, options) => {
    const responses = await Promise.all(tripIds.map((tripId) => expensesApi.getByTrip(tripId, options)));
    return responses.flatMap((items) => Array.isArray(items) ? items : []);
  },
  loadBudgetGauges: (tripIds, options) => Promise.all(tripIds.map((tripId) => expensesApi.getBudgetGauge(tripId, options))),
} });
export const payments = createResourceSlice({ name: 'payments', api: paymentsApi, idKey: 'paymentId', list: scoped(paymentsApi) });
export const refunds = createResourceSlice({ name: 'refunds', api: refundsApi, idKey: 'refundId', list: scoped(refundsApi), operations: {
  updateStatus: (id, status, options) => refundsApi.updateStatus(id, status, options),
} });
export const guides = createResourceSlice({ name: 'guides', api: guidesApi, idKey: 'guideId', list: scoped(guidesApi), operations: {
  createApproval: (payload, options) => approvalsApi.create(payload, options),
  getAvailable: (startDate, endDate, options) => guidesApi.getAvailable(startDate, endDate, options),
} });
export const reviews = createResourceSlice({ name: 'reviews', api: reviewsApi, idKey: 'reviewId', list: scoped(reviewsApi), operations: {
  respond: (id, payload, options) => reviewsApi.respond(id, payload, options),
  getGuideStats: (guideId, options) => reviewsApi.getGuideStats(guideId, options),
} });
export const supportTickets = createResourceSlice({ name: 'supportTickets', api: supportTicketsApi, idKey: 'ticketId', list: scoped(supportTicketsApi), operations: {
  updateStatus: (id, status, options) => supportTicketsApi.updateStatus(id, status, options),
  reply: (id, payload, options) => supportTicketsApi.reply(id, payload, options),
  assign: (id, payload, options) => supportTicketsApi.assign(id, payload, options),
  adjudicate: (id, payload, options) => supportTicketsApi.adjudicate(id, payload, options),
} });
export const messages = createResourceSlice({ name: 'messages', api: messagesApi, idKey: 'messageId', list: (args = {}, options) => (
  args.userType ? messagesApi.getByUser(args.userType, args.userId, options) : messagesApi.getAll(options)
), operations: {
  getConversation: (senderType, senderId, receiverType, receiverId, options) => messagesApi.getConversation(senderType, senderId, receiverType, receiverId, options),
} });
export const travelerDashboard = createResourceSlice({
  name: 'travelerDashboard',
  api: {},
  idKey: 'travelerId',
  list: (args, options) => dashboardApi.getTraveler(args.travelerId, options),
});
export const agencyCommissions = createResourceSlice({
  name: 'agencyCommissions',
  api: {},
  idKey: 'commissionId',
  list: (_args, options) => agencyApi.getCommissions(options),
});
export const guideDashboard = createResourceSlice({
  name: 'guideDashboard',
  api: {},
  idKey: 'guideId',
  list: (args, options) => dashboardApi.getGuide(args.guideId, options),
});
export const supportDashboard = createResourceSlice({
  name: 'supportDashboard',
  api: {},
  idKey: 'careId',
  list: (_args, options) => dashboardApi.getSupport(options),
});

// Superuser governance resources. Each screen gets a Redux-owned cache and
// async operations so components never own backend request state.
export const superuserDashboard = createResourceSlice({
  name: 'superuserDashboard', api: {}, idKey: 'id',
  list: async (_args, options) => {
    const started = performance.now();
    const [dash, revenue, travelersList, guidesList, tripsList, bookingsList, approvalsList] = await Promise.all([
      dashboardEndpoints.getSuperuser(options), revenueApi.getOverview(options), travelersApi.getAll(options),
      guidesApi.getAll(options), tripsApi.getAll(options), bookingsApi.getAll(options), approvalsApi.getAll({ status: 'PENDING' }, options),
    ]);
    return [{
      dash, revenue,
      travelerCount: Array.isArray(travelersList) ? travelersList.length : 0,
      guideCount: Array.isArray(guidesList) ? guidesList.length : 0,
      tripCount: Array.isArray(tripsList) ? tripsList.length : 0,
      bookingCount: Array.isArray(bookingsList) ? bookingsList.length : 0,
      pendingApprovals: Array.isArray(approvalsList) ? approvalsList : [],
      measuredLatencyMs: Math.round(performance.now() - started),
    }];
  }, operations: {
    approve: (id, reason, options) => approvalsApi.approve(id, reason, options),
    reject: (id, reason, options) => approvalsApi.reject(id, reason, options),
  },
});
export const superuserReports = createResourceSlice({
  name: 'superuserReports', api: {}, idKey: 'id',
  list: async (_args, options) => {
    const [dash, revenue, tripRows, bookingRows, reviewRows] = await Promise.all([
      dashboardEndpoints.getSuperuser(options), revenueApi.getOverview(options), tripsApi.getAll(options),
      bookingsApi.getAll(options), reviewsApi.getAll(options),
    ]);
    return [{ dash, revenue, trips: tripRows || [], bookings: bookingRows || [], reviews: reviewRows || [] }];
  },
});
export const superuserRevenue = createResourceSlice({
  name: 'superuserRevenue', api: {}, idKey: 'id',
  list: async (_args, options) => {
    const [overview, breakdown, transactions, config] = await Promise.all([
      revenueApi.getOverview(options), revenueApi.getBreakdown(options), revenueApi.getTransactions(options), revenueApi.getConfig(options),
    ]);
    return [{ overview, breakdown: breakdown || {}, transactions: transactions || [], config: config || [] }];
  }, operations: { updateConfig: (key, data, options) => revenueApi.updateConfig(key, data, options) },
});
export const superuserRules = createResourceSlice({
  name: 'superuserRules', api: {}, idKey: 'id',
  list: async (_args, options) => {
    const [rules, logs] = await Promise.all([systemConfigApi.getRules(options), systemConfigApi.getAuditLogs(options)]);
    return [{ rules, logs: logs || [] }];
  }, operations: {
    saveRules: async (rules, options) => {
      const updated = await systemConfigApi.updateRules(rules, options);
      const logs = await systemConfigApi.getAuditLogs(options);
      return { rules: updated, logs: logs || [] };
    },
  },
});
export const superuserIntegrations = createResourceSlice({
  name: 'superuserIntegrations', api: {}, idKey: 'id',
  list: async (_args, options) => {
    const [integrations, logs] = await Promise.all([systemConfigApi.getIntegrations(options), systemConfigApi.getAuditLogs(options)]);
    return [...(integrations || [])];
  }, operations: {
    updateIntegration: (id, changes, options) => systemConfigApi.updateIntegration(id, changes, options),
    loadAuditLogs: (_payload, options) => systemConfigApi.getAuditLogs(options),
    probeHealth: (_payload, options) => healthApi.check(options),
  },
});
export const superuserPaymentMethods = createResourceSlice({
  name: 'superuserPaymentMethods', api: {}, idKey: 'id',
  list: (args = {}, options) => args.scope === 'payments' ? paymentsApi.getAll(options) : systemConfigApi.getPaymentMethods(options),
  operations: {
    updateMethod: (id, changes, options) => systemConfigApi.updatePaymentMethod(id, changes, options),
    loadAuditLogs: (_payload, options) => systemConfigApi.getAuditLogs(options),
  },
});
export const superuserProfile = createResourceSlice({
  name: 'superuserProfile', api: {}, idKey: 'adminId',
  list: (args, options) => adminsApi.getById(args.id, options),
  operations: { saveProfile: (id, changes, options) => adminsApi.update(id, changes, options) },
});
export const superuserUsers = createResourceSlice({
  name: 'superuserUsers', api: {}, idKey: 'id',
  list: async (_args, options) => {
    const [travelerRows, guideRows, supportRows, adminRows] = await Promise.all([
      travelersApi.getAll(options), guidesApi.getAll(options), superUsersApi.getSupportUsers(options), superUsersApi.getAdmins(options),
    ]);
    return [
      ...(travelerRows || []).map((item) => ({ ...item, id: `T${item.travelerId}`, numericId: item.travelerId, role: 'Traveler', phone: item.phone || 'N/A', gender: item.gender || 'N/A', age: item.age ?? 'N/A' })),
      ...(guideRows || []).map((item) => ({ ...item, id: `G${item.guideId}`, numericId: item.guideId, role: 'Guide', phone: item.contact || 'N/A', languages: Array.isArray(item.languages) ? item.languages.join(', ') : item.languages || '', experience: item.experience ?? 0, pricePerTrip: item.pricePerTrip ?? 0, rating: item.rating ?? 5 })),
      ...(supportRows || []).map((item) => ({ ...item, id: `S${item.careId}`, numericId: item.careId, role: 'Support Staff', phone: item.contact || 'N/A' })),
      ...(adminRows || []).map((item) => ({ ...item, id: `A${item.adminId}`, numericId: item.adminId, role: item.role === 'superuser' ? 'Superuser' : 'Administrator', adminRole: item.role, phone: 'Internal Staff' })),
    ];
  }, operations: {
    createGuide: (payload, options) => guidesApi.create(payload, options),
    createTraveler: (payload, options) => travelersApi.create(payload, options),
    createSupport: (payload, options) => superUsersApi.createSupportUser(payload, options),
    createAdmin: (payload, options) => superUsersApi.createAdmin(payload, options),
    updateGuide: (id, payload, options) => guidesApi.update(id, payload, options),
    updateTraveler: (id, payload, options) => travelersApi.update(id, payload, options),
    removeGuide: (id, options) => guidesApi.delete(id, options),
    removeTraveler: (id, options) => travelersApi.delete(id, options),
    removeSupport: (id, options) => superUsersApi.deleteSupportUser(id, options),
    removeAdmin: (id, options) => superUsersApi.deleteAdmin(id, options),
  },
});
export const adminDashboard = createResourceSlice({
  name: 'adminDashboard', api: {}, idKey: 'id',
  list: (_args, options) => dashboardApi.getAdmin(options),
});
export const adminProfile = createResourceSlice({
  name: 'adminProfile', api: {}, idKey: 'adminId',
  list: (args, options) => adminsApi.getById(args.id, options),
  operations: { saveProfile: (id, changes, options) => adminsApi.update(id, changes, options) },
});
const settledList = (result) => result?.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [];
export const adminBookings = createResourceSlice({
  name: 'adminBookings', api: {}, idKey: 'bookingId',
  list: async (_args, options) => {
    const results = await Promise.allSettled([bookingsApi.getAll(options), tripsApi.getAll(options), travelersApi.getAll(options), agenciesApi.getAll(options), paymentsApi.getAll(options)]);
    return [{ bookings: settledList(results[0]), trips: settledList(results[1]), travelers: settledList(results[2]), agencies: settledList(results[3]), payments: settledList(results[4]) }];
  },
});
export const adminTrips = createResourceSlice({
  name: 'adminTrips', api: {}, idKey: 'tripId',
  list: async (_args, options) => {
    const results = await Promise.allSettled([tripsApi.getAll(options), travelersApi.getAll(options), agenciesApi.getAll(options), guidesApi.getAll(options), packagesApi.getAll(options)]);
    return [{ trips: settledList(results[0]), travelers: settledList(results[1]), agencies: settledList(results[2]), guides: settledList(results[3]), packages: settledList(results[4]) }];
  }, operations: { requestReassignment: (id, payload, options) => tripsApi.requestReassignment(id, payload, options) },
});
export const adminReports = createResourceSlice({
  name: 'adminReports', api: {}, idKey: 'id',
  list: async (_args, options) => {
    const results = await Promise.allSettled([dashboardApi.getAdmin(options), tripsApi.getAll(options), bookingsApi.getAll(options), reviewsApi.getAll(options), revenueApi.getOverview(options), revenueApi.getBreakdown(options), revenueApi.getTransactions(options), revenueApi.getConfig(options)]);
    return [{ dashboard: results[0]?.value, trips: settledList(results[1]), bookings: settledList(results[2]), reviews: settledList(results[3]), overview: results[4]?.value, breakdown: results[5]?.value, transactions: settledList(results[6]), config: settledList(results[7]) }];
  },
});
export const adminReviews = createResourceSlice({
  name: 'adminReviews', api: {}, idKey: 'reviewId',
  list: async (_args, options) => {
    const results = await Promise.all([reviewsApi.getAll(options), tripsApi.getAll(options), travelersApi.getAll(options), guidesApi.getAll(options)]);
    return [{ reviews: results[0] || [], trips: results[1] || [], travelers: results[2] || [], guides: results[3] || [] }];
  },
});
export const supportProfile = createResourceSlice({
  name: 'supportProfile', api: {}, idKey: 'careId',
  list: (args, options) => supportUsersApi.getById(args.id, options),
  operations: { saveProfile: (id, changes, options) => supportUsersApi.update(id, changes, options) },
});
