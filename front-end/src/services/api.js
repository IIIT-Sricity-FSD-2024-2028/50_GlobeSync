// ==========================================================
// GlobeSync — Central API Layer (JWT Authenticated)
// ==========================================================
// - Base URL loaded from VITE_API_BASE_URL (defaults to http://localhost:3001)
// - Uses standard Authorization: Bearer <jwt-token> and httpOnly cookie credentials
// - Roles are cryptographically verified by backend from the JWT token
// - Automatic token refresh on 401 with retry
// - Supports GET, POST, PUT, PATCH, DELETE with AbortSignal cancellation
// ==========================================================

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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
 * In-memory / storage JWT Access Token management
 */
let inMemoryAccessToken = localStorage.getItem('access_token') || null;
let inMemoryRefreshToken = localStorage.getItem('refresh_token') || null;

export function getAccessToken() {
  return inMemoryAccessToken || localStorage.getItem('access_token') || null;
}

export function setAccessToken(token) {
  inMemoryAccessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
}

export function getRefreshToken() {
  return inMemoryRefreshToken || localStorage.getItem('refresh_token') || null;
}

export function setRefreshToken(token) {
  inMemoryRefreshToken = token;
  if (token) {
    localStorage.setItem('refresh_token', token);
  } else {
    localStorage.removeItem('refresh_token');
  }
}

export function clearAccessToken() {
  inMemoryAccessToken = null;
  inMemoryRefreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
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
 * Extract active user ID from stored user object for UI helpers
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
 * Build request headers including content-type and JWT authorization
 */
export function buildHeaders(customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Core HTTP request handler with automatic token refresh
 */
export async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    signal = null,
    _retry = false,
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    method,
    headers: buildHeaders(headers),
    credentials: 'include', // Transmit httpOnly cookies (refresh_token, access_token)
    signal,
  };

  if (body !== null && body !== undefined) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('Request was cancelled', 0, null, true);
    }
    throw new ApiError(
      err.message || 'Network connection error. Is backend server running?',
      0,
      null
    );
  }

  // Handle 401 Unauthorized with token refresh if not already retrying
  if (response.status === 401 && !_retry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      let refreshSucceeded = false;
      let isAuthExpired = false;
      let refreshError = null;

      try {
        const currentRefreshToken = getRefreshToken();
        const refreshBody = currentRefreshToken ? { refreshToken: currentRefreshToken } : {};
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(refreshBody),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.accessToken) {
            setAccessToken(refreshData.accessToken);
            if (refreshData.refreshToken) {
              setRefreshToken(refreshData.refreshToken);
            }
            refreshSucceeded = true;
            onRefreshed(refreshData.accessToken);
            isRefreshing = false;
            // Retry the original failed request with the new access token
            return request(endpoint, { ...options, _retry: true });
          }
        } else if (refreshRes.status === 401 || refreshRes.status === 403) {
          // Genuinely unrecoverable 401/403 on refresh
          isAuthExpired = true;
          refreshError = new ApiError('Session expired. Please log in again.', 401);
        } else {
          // Server error (500, etc.) - don't trigger logout
          refreshError = new ApiError(`Token refresh failed with status ${refreshRes.status}`, refreshRes.status);
        }
      } catch (refreshErr) {
        // Network connection error - do NOT treat as session expired
        console.warn('[Auth] Token auto-refresh network error:', refreshErr);
        refreshError = new ApiError(refreshErr.message || 'Network connection error while refreshing session.', 0);
      } finally {
        if (!refreshSucceeded) {
          // Always call onRefreshed(null) when refresh fails or throws before setting isRefreshing = false so queued promises never hang
          onRefreshed(null);
          isRefreshing = false;
        }
      }

      if (isAuthExpired) {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        throw refreshError;
      }

      if (refreshError) {
        throw refreshError;
      }
    } else {
      // Queue until the ongoing refresh completes
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (newToken) {
            resolve(request(endpoint, { ...options, _retry: true }));
          } else {
            reject(new ApiError('Session expired. Please log in again.', 401));
          }
        });
      });
    }
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
      if (Array.isArray(data.message)) {
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
  // Unified cryptographic login endpoint
  login: (credentials, options) =>
    apiPost('/auth/login', credentials, options),

  // Registration endpoints (restricted to traveler and agency)
  registerTraveler: (dto, options) =>
    apiPost('/auth/register/traveler', dto, options),

  registerAgency: (dto, options) =>
    apiPost('/auth/register/agency', dto, options),

  // Session & token lifecycle
  refresh: async (refreshToken, options) => {
    const token = refreshToken || getRefreshToken();
    const data = await apiPost('/auth/refresh', token ? { refreshToken: token } : {}, options);
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
    }
    if (data?.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
    return data;
  },

  logout: async (options) => {
    const token = getRefreshToken();
    try {
      return await apiPost('/auth/logout', token ? { refreshToken: token } : {}, options);
    } finally {
      clearAccessToken();
    }
  },

  me: (options) =>
    apiGet('/auth/me', options),

  // Password reset flow
  forgotPassword: (email, options) =>
    apiPost('/auth/forgot-password', { email }, options),

  resetPassword: (token, newPassword, options) =>
    apiPost('/auth/reset-password', { token, newPassword }, options),

  // Backwards-compatible shims mapping to unified login
  loginTraveler: (credentials, options) =>
    apiPost('/auth/login', credentials, options),

  loginStaff: (credentials, options) =>
    apiPost('/auth/login', credentials, options),

  loginAgency: (credentials, options) =>
    apiPost('/auth/login', credentials, options),
};

export const travelersApi = {
  getAll: (options) =>
    apiGet('/travelers', options),

  getById: (id, options) =>
    apiGet(`/travelers/${id}`, options),

  update: (id, travelerData, options) =>
    apiPut(`/travelers/${id}`, travelerData, options),

  delete: (id, options) =>
    apiDelete(`/travelers/${id}`, options),
};

export const agenciesApi = {
  getAll: (options) => apiGet('/agencies', options),
  create: (data, options) => apiPost('/agencies', data, options),
  update: (id, data, options) => apiPatch(`/agencies/${id}`, data, options),
  updateStatus: (id, data, options) => apiPatch(`/agencies/${id}/status`, data, options),
  delete: (id, options) => apiDelete(`/agencies/${id}`, options),
  getLookup: (options) =>
    apiGet('/agencies/lookup', options),

  getById: (id, options) =>
    apiGet(`/agencies/${id}`, options),
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

  patch: (id, tripData, options) =>
    apiPatch(`/trips/${id}`, tripData, options),

  updateStatus: (id, statusOrPayload, options) => {
    const payload = typeof statusOrPayload === 'object' ? statusOrPayload : { status: statusOrPayload };
    return apiPatch(`/trips/${id}/status`, payload, options);
  },

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

  getByGuide: (guideId, options) =>
    apiGet(`/bookings/guide/${guideId}`, options),

  create: (bookingData, options) =>
    apiPost('/bookings', bookingData, options),

  update: (id, bookingData, options) =>
    apiPut(`/bookings/${id}`, bookingData, options),

  cancel: (id, reason, options) =>
    apiPost(`/bookings/${id}/cancel`, { reason }, options),

  cancellationPreview: (id, options) =>
    apiGet(`/bookings/${id}/cancellation-preview`, options),

  delete: (id, options) =>
    apiDelete(`/bookings/${id}`, options),
};

export const expensesApi = {
  getByTrip: (tripId, options) =>
    apiGet(`/expenses/trip/${tripId}`, options),

  /** GET /expenses/trip/:tripId/budget-gauge — returns { totalBudget, totalExpenses, percentUsed, remaining } */
  getBudgetGauge: (tripId, options) =>
    apiGet(`/expenses/trip/${tripId}/budget-gauge`, options),

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

  create: (guideData, options) =>
    apiPost('/guides', guideData, options),

  update: (id, guideData, options) =>
    apiPut(`/guides/${id}`, guideData, options),

  delete: (id, options) =>
    apiDelete(`/guides/${id}`, options),
};

export const reviewsApi = {
  getAll: (options) =>
    apiGet('/reviews', options),

  getById: (id, options) =>
    apiGet(`/reviews/${id}`, options),

  getByTrip: (tripId, options) =>
    apiGet(`/reviews/trip/${tripId}`, options),

  getByGuide: (guideId, options) =>
    apiGet(`/reviews/guide/${guideId}`, options),

  /** GET /reviews/guide/:guideId/stats — returns { guideId, count, avg, starBreakdown, recommendPercentage } */
  getGuideStats: (guideId, options) =>
    apiGet(`/reviews/guide/${guideId}/stats`, options),

  create: (reviewData, options) =>
    apiPost('/reviews', reviewData, options),

  /** POST /reviews/:id/response — guide posts a public response */
  respond: (id, data, options) =>
    apiPost(`/reviews/${id}/response`, data, options),

  delete: (id, options) =>
    apiDelete(`/reviews/${id}`, options),
};

export const supportTicketsApi = {
  getAll: (options) =>
    apiGet('/support-tickets', options),

  getById: (id, options) =>
    apiGet(`/support-tickets/${id}`, options),

  getByTraveler: (travelerId, options) =>
    apiGet(`/support-tickets/traveler/${travelerId}`, options),

  getByAgency: (agencyId, options) =>
    apiGet(`/support-tickets/agency/${agencyId}`, options),

  create: (ticketData, options) =>
    apiPost('/support-tickets', ticketData, options),

  updateStatus: (id, status, options) =>
    apiPatch(`/support-tickets/${id}/status`, { status }, options),

  reply: (id, replyData, options) =>
    apiPost(`/support-tickets/${id}/reply`, replyData, options),

  /** PATCH /support-tickets/:id/assign — assign ticket to a care agent */
  assign: (id, data, options) =>
    apiPatch(`/support-tickets/${id}/assign`, data, options),

  /** POST /support-tickets/:id/notes — add an internal note (hidden from traveler/agency) */
  addInternalNote: (id, data, options) =>
    apiPost(`/support-tickets/${id}/notes`, data, options),

  /** GET /support-tickets/:id/notes — list internal notes for a ticket */
  getInternalNotes: (id, options) =>
    apiGet(`/support-tickets/${id}/notes`, options),

  /** POST /support-tickets/:id/adjudicate — refund adjudication via PolicyService */
  adjudicate: (id, data, options) =>
    apiPost(`/support-tickets/${id}/adjudicate`, data, options),
};

export const messagesApi = {
  getAll: (options) =>
    apiGet('/messages', options),

  getByUser: (userType, userId, options) =>
    apiGet(`/messages/user/${userType}/${userId}`, options),

  getConversation: (senderType, senderId, receiverType, receiverId, options) =>
    apiGet(
      `/messages/conversation?sender=${encodeURIComponent(senderType)}&senderId=${senderId}&receiver=${encodeURIComponent(receiverType)}&receiverId=${receiverId}`,
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

export const adminsApi = {
  getById: (id, options) => apiGet(`/admins/${id}`, options),
  update: (id, data, options) => apiPut(`/admins/${id}`, data, options),
};

// Revenue is mounted at /api; tolerate a configured base ending in /api.
const revenuePath = (suffix) =>
  `${API_BASE_URL.endsWith('/') ? '' : '/'}${/\/api\/?$/.test(API_BASE_URL) ? '' : 'api/'}admin/revenue/${suffix}`;
export const revenueApi = {
  getOverview: (options) => apiGet(revenuePath('overview'), options),
  getBreakdown: (options) => apiGet(revenuePath('breakdown'), options),
  getTransactions: (options) => apiGet(revenuePath('transactions'), options),
  getConfig: (options) => apiGet(revenuePath('config'), options),
  updateConfig: (key, data, options) =>
    apiPut(revenuePath(`config/${key}`), data, options),
};

export const systemConfigApi = {
  getRules: (options) => apiGet('/system-config/rules', options),
  updateRules: (rulesData, options) => apiPut('/system-config/rules', rulesData, options),
  getPaymentMethods: (options) => apiGet('/system-config/payment-methods', options),
  updatePaymentMethod: (id, data, options) => apiPut(`/system-config/payment-methods/${id}`, data, options),
  getIntegrations: (options) => apiGet('/system-config/integrations', options),
  updateIntegration: (id, data, options) => apiPut(`/system-config/integrations/${id}`, data, options),
  getAuditLogs: (options) => apiGet('/system-config/audit-logs', options),
};

export const superUsersApi = {
  getAdmins: (options) => apiGet('/super/admins', options),
  createAdmin: (data, options) => apiPost('/super/admins', data, options),
  deleteAdmin: (id, options) => apiDelete(`/super/admins/${id}`, options),
  getSupportUsers: (options) => apiGet('/super/support-users', options),
  createSupportUser: (data, options) => apiPost('/super/support-users', data, options),
  deleteSupportUser: (id, options) => apiDelete(`/super/support-users/${id}`, options),
};

export const supportUsersApi = {
  getById: (id, options) => apiGet(`/support-users/${id}`, options),
  update: (id, data, options) => apiPut(`/support-users/${id}`, data, options),
};

export const agencyRevenueApi = {
  getRevenue: (agencyId, options) =>
    apiGet(`/api/agencies/${agencyId}/revenue`, options),
};

export const subscriptionsApi = {
  getPlans: (options) =>
    apiGet('/api/subscriptions/plans', options),

  getAgencySubscription: (agencyId, options) =>
    apiGet(`/api/agencies/${agencyId}/subscription`, options),

  subscribe: (data, options) =>
    apiPost('/api/subscriptions', data, options),
};

export const promotionsApi = {
  getAll: (options) =>
    apiGet('/api/promotions', options),

  create: (data, options) =>
    apiPost('/api/promotions', data, options),
};

export const uploadsApi = {
  uploadAttachment: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}/uploads/attachment`;
    const config = {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
      signal: options.signal,
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new ApiError('Upload was cancelled', 0, null, true);
      }
      throw new ApiError(
        err.message || 'Network error while uploading file.',
        0,
        null
      );
    }

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

    if (!response.ok) {
      const message =
        (data && (data.message || data.error)) ||
        `Upload failed with HTTP ${response.status}`;
      throw new ApiError(
        Array.isArray(message) ? message.join('; ') : message,
        response.status,
        data
      );
    }

    return data;
  },
};



export const agencyApi = {
  getProfile: (options) => apiGet('/api/agency/profile', options),
  updateProfile: (data, options) => apiPatch('/api/agency/profile', data, options),
  getCommissions: (options) => apiGet('/api/agency/commissions', options),
  getPassengers: (options) => apiGet('/api/agency/passengers', options),
  updateTrip: (id, data, options) => apiPatch(`/api/agency/trips/${id}`, data, options),
  getTicketThread: (id, options) => apiGet(`/api/agency/support/${id}`, options),
  replyTicket: (id, data, options) => apiPost(`/api/agency/support/${id}/reply`, data, options),
};

export const notificationsApi = {
  getAll: (params = {}, options = {}) => {
    const query = new URLSearchParams();
    if (params.since) query.append('since', params.since);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiGet(`/notifications${qs}`, options);
  },
  markAsRead: (id, options) => apiPatch(`/notifications/${id}/read`, {}, options),
  markAllAsRead: (options) => apiPatch('/notifications/read-all', {}, options),
};
