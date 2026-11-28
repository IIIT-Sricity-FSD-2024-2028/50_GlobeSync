import {
  agenciesApi, agencyApi, bookingsApi, dashboardApi, expensesApi, guidesApi, itinerariesApi, messagesApi,
  packagesApi, passengersApi, paymentsApi, refundsApi, reviewsApi, supportTicketsApi,
  travelersApi, tripsApi,
} from '../services/api';
import { createResourceSlice } from './createResourceSlice';

const scoped = (api, method = 'getAll') => (args, options) => {
  const { scope, id, ...rest } = args || {};
  if (scope && typeof api[scope] === 'function') return api[scope](id, options);
  return api[method](options, rest);
};

export const travelers = createResourceSlice({ name: 'travelers', api: travelersApi, idKey: 'travelerId', list: scoped(travelersApi) });
export const agencies = createResourceSlice({ name: 'agencies', api: agenciesApi, idKey: 'agencyId', list: scoped(agenciesApi) });
export const passengers = createResourceSlice({ name: 'passengers', api: passengersApi, idKey: ['passId', 'passengerId'], list: scoped(passengersApi) });
export const packages = createResourceSlice({ name: 'packages', api: packagesApi, idKey: 'packageId', list: scoped(packagesApi), operations: {
  archive: (id, payload, options) => packagesApi.archive(id, payload, options),
} });
export const trips = createResourceSlice({ name: 'trips', api: tripsApi, idKey: 'tripId', list: scoped(tripsApi), operations: {
  getById: (id, options) => tripsApi.getById(id, options),
  updateStatus: (id, status, options) => tripsApi.updateStatus(id, status, options),
  requestReassignment: (id, payload, options) => tripsApi.requestReassignment(id, payload, options),
  respondTravelerConsent: (id, payload, options) => tripsApi.respondTravelerConsent(id, payload, options),
  respondGuideAssignment: (id, payload, options) => tripsApi.respondGuideAssignment(id, payload, options),
  getMyReassignments: (_payload, options) => tripsApi.getMyReassignments(options),
} });
export const agencyProfile = createResourceSlice({ name: 'agencyProfile', api: agencyApi, idKey: 'agencyId', list: (_args, options) => agencyApi.getProfile(options), operations: {
  saveProfile: (payload, options) => agencyApi.updateProfile(payload, options),
} });
export const agencySupport = createResourceSlice({ name: 'agencySupport', api: supportTicketsApi, idKey: 'ticketId', list: (args, options) => supportTicketsApi.getByAgency(args.agencyId, options), operations: {
  getThread: (id, options) => agencyApi.getTicketThread(id, options),
  reply: (id, payload, options) => agencyApi.replyTicket(id, payload, options),
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
export const guides = createResourceSlice({ name: 'guides', api: guidesApi, idKey: 'guideId', list: scoped(guidesApi) });
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
