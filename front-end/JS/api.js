// ==========================================================
// GlobeSync — Shared API Helper
// ==========================================================
//
// Central module for all backend HTTP communication.
// Reads role and user from localStorage (same keys used by
// mockData.js Auth and admin-login.js / traveler-login.js).
//
// USAGE:
//   Include this file in any HTML page BEFORE page-specific JS:
//     <script src="../JS/api.js"></script>
//
//   Then call any helper:
//     const trips = await apiGet('/trips');
//     const newTrip = await apiPost('/trips', { destination: 'Paris', ... });
//     const updated = await apiPut('/trips/1', { budget: 200000 });
//     const patched = await apiPatch('/trips/1/status', { status: 'Confirmed' });
//     const result  = await apiDelete('/trips/1');
//
// ==========================================================

const BASE_URL = "http://localhost:3000";

// ---------------------------------------------------------
// Session helpers — mirror the Auth object in mockData.js
// ---------------------------------------------------------

/**
 * Get the current user role from localStorage.
 * Returns: 'traveler' | 'admin' | 'guide' | 'support' | 'superuser' | null
 */
function getCurrentRole() {
  return localStorage.getItem('role') || null;
}

/**
 * Get the current logged-in user object from localStorage.
 * Returns the parsed user object or null.
 */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
}

/**
 * Extract a numeric user ID from the stored user object.
 * The frontend mock data uses different key names per role:
 *   traveler → traveler_id  |  travelerId
 *   admin    → admin_id     |  adminId
 *   guide    → guide_id     |  guideId
 *   support  → care_id      |  careId
 *
 * Returns the ID as a string (for headers) or null.
 */
function getCurrentUserId() {
  const user = getCurrentUser();
  if (!user) return null;

  // Try camelCase keys first (backend format), then snake_case (mockData format)
  const id =
    user.travelerId || user.traveler_id ||
    user.adminId    || user.admin_id    ||
    user.guideId    || user.guide_id    ||
    user.careId     || user.care_id     ||
    user.id         || null;

  return id !== null && id !== undefined ? String(id) : null;
}

// ---------------------------------------------------------
// Request headers builder
// ---------------------------------------------------------

function buildHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  const role = getCurrentRole();
  if (role) {
    headers['x-user-role'] = role;
  }

  const userId = getCurrentUserId();
  if (userId) {
    headers['x-user-id'] = userId;
  }

  return headers;
}

// ---------------------------------------------------------
// Error handler
// ---------------------------------------------------------

async function handleResponse(response) {
  // Try to parse JSON body regardless of status
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    // Build a readable error message
    const msg =
      (data && data.message)
        ? (Array.isArray(data.message) ? data.message.join(', ') : data.message)
        : `Request failed with status ${response.status}`;

    console.error(`[API ${response.status}]`, msg, data);

    // Only alert on user-facing errors (not 404 which callers may handle silently)
    if (response.status === 403) {
      alert('Access denied. You do not have permission for this action.');
    } else if (response.status === 401) {
      alert('Unauthorized. Please log in again.');
    } else if (response.status >= 400 && response.status < 500) {
      alert(msg);
    } else if (response.status >= 500) {
      alert('Server error. Please try again later.');
    }

    // Throw so callers can catch if needed
    const err = new Error(msg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ---------------------------------------------------------
// HTTP methods
// ---------------------------------------------------------

/**
 * GET request.
 * @param {string} path - API path, e.g. '/trips' or '/dashboard/admin'
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiGet(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse(response);
}

/**
 * POST request.
 * @param {string} path - API path
 * @param {object} data - Request body
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiPost(path, data) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * PUT request (full update).
 * @param {string} path - API path, e.g. '/trips/1'
 * @param {object} data - Request body
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiPut(path, data) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * PATCH request (partial update).
 * @param {string} path - API path, e.g. '/trips/1/status'
 * @param {object} data - Request body
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiPatch(path, data) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * DELETE request.
 * @param {string} path - API path, e.g. '/trips/1'
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiDelete(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  return handleResponse(response);
}

// ---------------------------------------------------------
// Field name mapping utilities
// ---------------------------------------------------------
// Backend uses camelCase (travelerId, tripId).
// Frontend templates use snake_case (traveler_id, trip_id).
// These helpers bridge the gap automatically.

/**
 * Convert a camelCase string to snake_case.
 */
function camelToSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Convert a snake_case string to camelCase.
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Recursively convert all keys in an object/array from camelCase to snake_case.
 * This allows the frontend to consume API responses with its existing templates.
 */
function toSnakeCase(obj) {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[camelToSnake(key)] = toSnakeCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

/**
 * Recursively convert all keys in an object/array from snake_case to camelCase.
 * This allows sending data to the backend in the format it expects.
 */
function toCamelCase(obj) {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[snakeToCamel(key)] = toCamelCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

/**
 * GET with automatic camelCase→snake_case response conversion.
 */
async function apiGetSnake(path) {
  const data = await apiGet(path);
  return toSnakeCase(data);
}

/**
 * POST with snake_case→camelCase request body and camelCase→snake_case response.
 */
async function apiPostSnake(path, body) {
  const data = await apiPost(path, toCamelCase(body));
  return toSnakeCase(data);
}

/**
 * PUT with snake_case→camelCase request body and camelCase→snake_case response.
 */
async function apiPutSnake(path, body) {
  const data = await apiPut(path, toCamelCase(body));
  return toSnakeCase(data);
}

/**
 * PATCH with snake_case→camelCase request body and camelCase→snake_case response.
 */
async function apiPatchSnake(path, body) {
  const data = await apiPatch(path, toCamelCase(body));
  return toSnakeCase(data);
}

/**
 * DELETE with camelCase→snake_case response conversion.
 */
async function apiDeleteSnake(path) {
  const data = await apiDelete(path);
  return toSnakeCase(data);
}

/**
 * Get the current user's primary ID (numeric) regardless of field name format.
 */
function getUserId() {
  const u = getCurrentUser();
  if (!u) return null;
  return u.travelerId || u.traveler_id || u.adminId || u.admin_id ||
         u.guideId || u.guide_id || u.careId || u.care_id || u.id || null;
}

// ---------------------------------------------------------
// Integration guide (for developers)
// ---------------------------------------------------------
//
// To integrate api.js into any frontend page:
//
// 1. Add the script tag BEFORE the page-specific JS:
//      <script src="../JS/api.js"></script>
//      <script src="../JS/your-page.js"></script>
//
// 2. Replace direct DB/mockData calls with API calls:
//
//    BEFORE (mockData):
//      const trips = DB.trips.filter(t => t.traveler_id === userId);
//
//    AFTER (api.js with snake_case mapping):
//      const trips = await apiGetSnake(`/trips/traveler/${userId}`);
//      // trips[0].trip_id, trips[0].traveler_id — all snake_case!
//
// ==========================================================

