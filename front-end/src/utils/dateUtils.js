/**
 * Timezone-aware date utilities for GlobeSync Frontend.
 * Ensures consistent, timezone-correct date handling and display in the user's local time.
 */

/**
 * Returns the user's local IANA timezone (e.g. 'Asia/Kolkata', 'America/New_York').
 */
export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Format a UTC or ISO date string into the user's local date format.
 * Example: "2026-11-22T14:30:00Z" -> "22 Nov 2026"
 */
export function formatLocalDate(dateStr, options = {}) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Format a UTC or ISO date string into the user's local date + time format with timezone indicator.
 * Example: "2026-11-22T14:30:00Z" -> "22 Nov 2026, 08:00 pm IST"
 */
export function formatLocalDateTime(dateStr, options = {}) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
      ...options,
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Format time only in user's local timezone.
 * Example: "08:00 pm"
 */
export function formatLocalTime(dateStr, options = {}) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Format a human-readable relative time (e.g. "Just now", "10m ago", "2h ago", "Yesterday").
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);

    const diffSeconds = Math.round((Date.now() - d.getTime()) / 1000);
    if (diffSeconds < 45) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 172800) return 'Yesterday';
    return formatLocalDate(dateStr);
  } catch {
    return String(dateStr);
  }
}

/**
 * Converts a date input string or date object into a strict UTC ISO 8601 string for backend transmission.
 */
export function toUtcIsoString(dateInput) {
  if (!dateInput) return new Date().toISOString();
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
