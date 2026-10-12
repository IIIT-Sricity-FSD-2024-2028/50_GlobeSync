// ==========================================================
// GlobeSync — Central API Layer
// ==========================================================
// - Base URL loaded from VITE_API_BASE_URL (defaults to http://localhost:3000)
// - Sends 'x-user-role' and 'x-user-id' headers required by RolesGuard
// - Supports GET, POST, PUT, PATCH, DELETE with AbortSignal cancellation
// - Parses NestJS GlobalExceptionFilter error responses
// - Re-throws real errors without mock fallbacks
// - Uses standard backend camelCase property names
// ==========================================================

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Custom error class wrapping backend error responses
 */
export class ApiError extends Error {
  constructor(message, status = 500, data = null, isCancelled = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isCancelled = isCancelled;
  }
}

/**
 * Read session role from browser localStorage
 */
export function getStoredRole() {
  return localStorage.getItem('role') || null;
}

/**
 * Read session user object from browser localStorage
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Extract numeric user ID matching backend identity requirements
 */
export function getStoredUserId() {
  const user = getStoredUser();
  if (!user) return null;

  const id =
    user.travelerId ?? user.traveler_id ??
    user.adminId    ?? user.admin_id ??
    user.guideId    ?? user.guide_id ??
    user.careId     ?? user.care_id ??
    user.agencyId   ?? user.agency_id ??
    user.id;

  return id !== undefined && id !== null ? String(id) : null;
}

/**
 * Build request headers including content-type and role/user identity
 */
export function buildHeaders(customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const role = getStoredRole();
  if (role) {
    headers['x-user-role'] = role;
  }

  const userId = getStoredUserId();
  if (userId) {
    headers['x-user-id'] = userId;
  }

  return headers;
}

/**
 * Core HTTP request handler
 */
export async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    signal = null,
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    method,
    headers: buildHeaders(headers),
    signal,
  };

  if (body !== null && body !== undefined) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    // If request was cancelled via AbortController signal
    if (err.name === 'AbortError') {
      throw new ApiError('Request was cancelled', 0, null, true);
    }
    // Network or server unreachable error
    throw new ApiError(
      err.message || 'Network connection error. Is backend server running?',
      0,
      null
    );
  }

  // 204 No Content
  if (response.status === 204) {
    return null;
  }

  // Parse JSON response body if present
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text().catch(() => null);
  }

  // Handle non-success HTTP status codes (4xx, 5xx)
  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;

    if (data && typeof data === 'object') {
      // NestJS GlobalExceptionFilter returns: { statusCode, error, message, timestamp, path }
      if (Array.isArray(data.message)) {
        // ValidationPipe returns an array of validation errors
        errorMsg = data.message.join(', ');
      } else if (typeof data.message === 'string') {
        errorMsg = data.message;
      } else if (data.error) {
        errorMsg = data.error;
      }
    }

    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}

// ----------------------------------------------------------
// Standard HTTP Method Wrappers (supports signal for cleanup)
// ----------------------------------------------------------

export function apiGet(endpoint, options = {}) {
  return request(endpoint, { method: 'GET', ...options });
}

export function apiPost(endpoint, body, options = {}) {
  return request(endpoint, { method: 'POST', body, ...options });
}

export function apiPut(endpoint, body, options = {}) {
  return request(endpoint, { method: 'PUT', body, ...options });
}

export function apiPatch(endpoint, body, options = {}) {
  return request(endpoint, { method: 'PATCH', body, ...options });
}

export function apiDelete(endpoint, options = {}) {
  return request(endpoint, { method: 'DELETE', ...options });
}

// ==========================================================
// Explicit Feature API Modules
// ==========================================================

export const authApi = {
  loginTraveler: (credentials, options) =>
    apiPost('/auth/traveler-login', credentials, options),

  loginStaff: (credentials, options) =>
    apiPost('/auth/staff-login', credentials, options),

  loginAgency: (credentials, options) =>
    apiPost('/auth/agency-login', credentials, options),

  registerTraveler: (travelerData, options) =>
    apiPost('/travelers', travelerData, options),

  registerAgency: (agencyData, options) =>
    apiPost('/agencies/register', agencyData, options),
};

export const travelersApi = {
  getById: (id, options) =>
    apiGet(`/travelers/${id}`, options),

  update: (id, travelerData, options) =>
    apiPut(`/travelers/${id}`, travelerData, options),

  delete: (id, options) =>
    apiDelete(`/travelers/${id}`, options),
};

export const passengersApi = {
  getAll: (options) =>
    apiGet('/passengers', options),

  getById: (id, options) =>
    apiGet(`/passengers/${id}`, options),

  getByTraveler: (travelerId, options) =>
    apiGet(`/passengers/traveler/${travelerId}`, options),

  getByAgency: (agencyId, options) =>
    apiGet(`/passengers/agency/${agencyId}`, options),

  create: (passengerData, options) =>
    apiPost('/passengers', passengerData, options),

  update: (id, passengerData, options) =>
    apiPatch(`/passengers/${id}`, passengerData, options),

  delete: (id, options) =>
    apiDelete(`/passengers/${id}`, options),
};

export const packagesApi = {
  getAll: (options) =>
    apiGet('/packages', options),

  getById: (id, options) =>
    apiGet(`/packages/${id}`, options),

  create: (pkgData, options) =>
    apiPost('/packages', pkgData, options),

  update: (id, pkgData, options) =>
    apiPut(`/packages/${id}`, pkgData, options),

  delete: (id, options) =>
    apiDelete(`/packages/${id}`, options),
};

export const tripsApi = {
  getAll: (options) =>
    apiGet('/trips', options),

  getById: (id, options) =>
    apiGet(`/trips/${id}`, options),

  getByTraveler: (travelerId, options) =>
    apiGet(`/trips/traveler/${travelerId}`, options),

  getByGuide: (guideId, options) =>
    apiGet(`/trips/guide/${guideId}`, options),

  getByAgency: (agencyId, options) =>
    apiGet(`/trips/agency/${agencyId}`, options),

  create: (tripData, options) =>
    apiPost('/trips', tripData, options),

  update: (id, tripData, options) =>
    apiPut(`/trips/${id}`, tripData, options),

  updateStatus: (id, status, options) =>
    apiPatch(`/trips/${id}/status`, { status }, options),

  delete: (id, options) =>
    apiDelete(`/trips/${id}`, options),
};

export const itinerariesApi = {
  getByTrip: (tripId, options) =>
    apiGet(`/itineraries/trip/${tripId}`, options),

  create: (itineraryData, options) =>
    apiPost('/itineraries', itineraryData, options),

  update: (id, itineraryData, options) =>
    apiPut(`/itineraries/${id}`, itineraryData, options),

  delete: (id, options) =>
    apiDelete(`/itineraries/${id}`, options),
};

export const bookingsApi = {
  getAll: (options) =>
    apiGet('/bookings', options),

  getById: (id, options) =>
    apiGet(`/bookings/${id}`, options),

  getByTraveler: (travelerId, options) =>
    apiGet(`/bookings/traveler/${travelerId}`, options),

  getByAgency: (agencyId, options) =>
    apiGet(`/bookings/agency/${agencyId}`, options),

  create: (bookingData, options) =>
    apiPost('/bookings', bookingData, options),

  update: (id, bookingData, options) =>
    apiPut(`/bookings/${id}`, bookingData, options),

  delete: (id, options) =>
    apiDelete(`/bookings/${id}`, options),
};

export const expensesApi = {
  getByTrip: (tripId, options) =>
    apiGet(`/expenses/trip/${tripId}`, options),

  create: (expenseData, options) =>
    apiPost('/expenses', expenseData, options),

  update: (id, expenseData, options) =>
    apiPut(`/expenses/${id}`, expenseData, options),

  delete: (id, options) =>
    apiDelete(`/expenses/${id}`, options),
};

export const paymentsApi = {
  getAll: (options) =>
    apiGet('/payments', options),

  getById: (id, options) =>
    apiGet(`/payments/${id}`, options),

  getByBooking: (bookingId, options) =>
    apiGet(`/payments/booking/${bookingId}`, options),

  getByAgency: (agencyId, options) =>
    apiGet(`/payments/agency/${agencyId}`, options),

  create: (paymentData, options) =>
    apiPost('/payments', paymentData, options),
};

export const refundsApi = {
  getAll: (options) =>
    apiGet('/refunds', options),

  getById: (id, options) =>
    apiGet(`/refunds/${id}`, options),

  getByAgency: (agencyId, options) =>
    apiGet(`/refunds/agency/${agencyId}`, options),

  create: (refundData, options) =>
    apiPost('/refunds', refundData, options),

  updateStatus: (id, refundStatus, options) =>
    apiPatch(`/refunds/${id}/status`, { refundStatus }, options),
};

export const guidesApi = {
  getAll: (options) =>
    apiGet('/guides', options),

  getById: (id, options) =>
    apiGet(`/guides/${id}`, options),
};

export const supportTicketsApi = {
  getAll: (options) =>
    apiGet('/support-tickets', options),

  getByTraveler: (travelerId, options) =>
    apiGet(`/support-tickets/traveler/${travelerId}`, options),

  getByAgency: (agencyId, options) =>
    apiGet(`/support-tickets/agency/${agencyId}`, options),

  create: (ticketData, options) =>
    apiPost('/support-tickets', ticketData, options),

  updateStatus: (id, status, options) =>
    apiPatch(`/support-tickets/${id}/status`, { status }, options),
};

export const messagesApi = {
  getAll: (options) =>
    apiGet('/messages', options),

  getByUser: (userType, userId, options) =>
    apiGet(`/messages/user/${userType}/${userId}`, options),

  getConversation: (senderType, senderId, receiverType, receiverId, options) =>
    apiGet(
      `/messages/conversation?senderType=${encodeURIComponent(senderType)}&senderId=${senderId}&receiverType=${encodeURIComponent(receiverType)}&receiverId=${receiverId}`,
      options
    ),

  create: (messageData, options) =>
    apiPost('/messages', messageData, options),
};

export const dashboardApi = {
  getAdmin: (options) =>
    apiGet('/dashboard/admin', options),

  getSuperuser: (options) =>
    apiGet('/dashboard/superuser', options),

  getTraveler: (travelerId, options) =>
    apiGet(`/dashboard/traveler/${travelerId}`, options),

  getGuide: (guideId, options) =>
    apiGet(`/dashboard/guide/${guideId}`, options),

  getSupport: (options) =>
    apiGet('/dashboard/support', options),

  getAgency: (agencyId, options) =>
    apiGet(`/dashboard/agency/${agencyId}`, options),
};

export const healthApi = {
  check: (options) =>
    apiGet('/health', options),
};
