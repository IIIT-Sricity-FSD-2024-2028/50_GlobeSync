import {
  agenciesApi, approvalsApi, bookingsApi, dashboardApi, guidesApi, healthApi,
  paymentsApi, refundsApi, reviewsApi, revenueApi, systemConfigApi, superUsersApi,
  travelersApi, tripsApi, adminsApi,
} from '../services/api';
import { createResourceSlice } from './createResourceSlice';

export const superuserAgencies = createResourceSlice({
  name: 'superuserAgencies', api: agenciesApi, idKey: 'agencyId', list: (args = {}, options) => agenciesApi.getAll(options),
  operations: {
    updateStatus: (id, payload, options) => agenciesApi.updateStatus(id, payload, options),
    getDetails: (id, options) => agenciesApi.getById(id, options),
    saveAgency: async (id, profile, statusPayload, options) => { const updated = await agenciesApi.update(id, profile, options); if (statusPayload) await agenciesApi.updateStatus(id, statusPayload, options); return updated; },
    createApproval: (payload, options) => approvalsApi.create(payload, options),
  },
});

export const superuserDashboard = createResourceSlice({
  name: 'superuserDashboard', api: {}, idKey: 'id', list: async (_args, options) => {
    const started = performance.now();
    const [dash, revenue, travelers, guides, trips, bookings, approvals] = await Promise.all([
      dashboardApi.getSuperuser(options), revenueApi.getOverview(options), travelersApi.getAll(options), guidesApi.getAll(options), tripsApi.getAll(options), bookingsApi.getAll(options), approvalsApi.getAll({ status: 'PENDING' }, options),
    ]);
    return [{ dash, revenue, travelerCount: travelers?.length || 0, guideCount: guides?.length || 0, tripCount: trips?.length || 0, bookingCount: bookings?.length || 0, pendingApprovals: approvals || [], measuredLatencyMs: Math.round(performance.now() - started) }];
  }, operations: { approve: (id, reason, options) => approvalsApi.approve(id, reason, options), reject: (id, reason, options) => approvalsApi.reject(id, reason, options) },
});

export const superuserReports = createResourceSlice({
  name: 'superuserReports', api: {}, idKey: 'id', list: async (_args, options) => {
    const [dash, revenue, trips, bookings, reviews] = await Promise.all([dashboardApi.getSuperuser(options), revenueApi.getOverview(options), tripsApi.getAll(options), bookingsApi.getAll(options), reviewsApi.getAll(options)]);
    return [{ dash, revenue, trips: trips || [], bookings: bookings || [], reviews: reviews || [] }];
  },
});

export const superuserRevenue = createResourceSlice({
  name: 'superuserRevenue', api: {}, idKey: 'id', list: async (_args, options) => {
    const [overview, breakdown, transactions, config] = await Promise.all([revenueApi.getOverview(options), revenueApi.getBreakdown(options), revenueApi.getTransactions(options), revenueApi.getConfig(options)]);
    return [{ overview, breakdown: breakdown || {}, transactions: transactions || [], config: config || [] }];
  }, operations: { updateConfig: (key, data, options) => revenueApi.updateConfig(key, data, options) },
});

export const superuserRules = createResourceSlice({
  name: 'superuserRules', api: {}, idKey: 'id', list: async (_args, options) => {
    const [rules, logs] = await Promise.all([systemConfigApi.getRules(options), systemConfigApi.getAuditLogs(options)]);
    return [{ rules, logs: logs || [] }];
  }, operations: { saveRules: async (rules, options) => ({ rules: await systemConfigApi.updateRules(rules, options), logs: await systemConfigApi.getAuditLogs(options) }) },
});

export const superuserIntegrations = createResourceSlice({
  name: 'superuserIntegrations', api: {}, idKey: 'id', list: async (_args, options) => systemConfigApi.getIntegrations(options),
  operations: { updateIntegration: (id, changes, options) => systemConfigApi.updateIntegration(id, changes, options), loadAuditLogs: (_payload, options) => systemConfigApi.getAuditLogs(options), probeHealth: (_payload, options) => healthApi.check(options) },
});

export const superuserPaymentMethods = createResourceSlice({
  name: 'superuserPaymentMethods', api: {}, idKey: 'id', list: (args = {}, options) => args.scope === 'payments' ? paymentsApi.getAll(options) : systemConfigApi.getPaymentMethods(options),
  operations: { updateMethod: (id, changes, options) => systemConfigApi.updatePaymentMethod(id, changes, options), loadAuditLogs: (_payload, options) => systemConfigApi.getAuditLogs(options) },
});

export const superuserProfile = createResourceSlice({ name: 'superuserProfile', api: {}, idKey: 'adminId', list: (args, options) => adminsApi.getById(args.id, options), operations: { saveProfile: (id, changes, options) => adminsApi.update(id, changes, options) } });

export const superuserUsers = createResourceSlice({
  name: 'superuserUsers', api: {}, idKey: 'id', list: async (_args, options) => {
    const [travelers, guides, support, admins] = await Promise.all([travelersApi.getAll(options), guidesApi.getAll(options), superUsersApi.getSupportUsers(options), superUsersApi.getAdmins(options)]);
    return [
      ...(travelers || []).map((item) => ({ ...item, id: `T${item.travelerId}`, numericId: item.travelerId, role: 'Traveler', phone: item.phone || 'N/A', gender: item.gender || 'N/A', age: item.age ?? 'N/A' })),
      ...(guides || []).map((item) => ({ ...item, id: `G${item.guideId}`, numericId: item.guideId, role: 'Guide', phone: item.contact || 'N/A', languages: Array.isArray(item.languages) ? item.languages.join(', ') : item.languages || '', experience: item.experience ?? 0, pricePerTrip: item.pricePerTrip ?? 0, rating: item.rating ?? 5 })),
      ...(support || []).map((item) => ({ ...item, id: `S${item.careId}`, numericId: item.careId, role: 'Support Staff', phone: item.contact || 'N/A' })),
      ...(admins || []).map((item) => ({ ...item, id: `A${item.adminId}`, numericId: item.adminId, role: item.role === 'superuser' ? 'Superuser' : 'Administrator', adminRole: item.role, phone: 'Internal Staff' })),
    ];
  }, operations: {
    createGuide: (payload, options) => guidesApi.create(payload, options), createTraveler: (payload, options) => travelersApi.create(payload, options), createSupport: (payload, options) => superUsersApi.createSupportUser(payload, options), createAdmin: (payload, options) => superUsersApi.createAdmin(payload, options), updateGuide: (id, payload, options) => guidesApi.update(id, payload, options), updateTraveler: (id, payload, options) => travelersApi.update(id, payload, options), removeGuide: (id, options) => guidesApi.delete(id, options), removeTraveler: (id, options) => travelersApi.delete(id, options), removeSupport: (id, options) => superUsersApi.deleteSupportUser(id, options), removeAdmin: (id, options) => superUsersApi.deleteAdmin(id, options),
  },
});
