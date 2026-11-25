/**
 * guideStateHelpers.js
 * 
 * Single, unified definition of guide request states and agency/traveler display names
 * across guide requests, dashboard counts, messaging cards, and assigned trips.
 *
 * Core rule:
 * - Guide acceptance depends strictly on guideStatus === 'Accepted', never on trip payment status (e.g. status === 'Confirmed').
 * - Guide decline depends strictly on guideStatus === 'Declined' or unassigned state.
 * - Guide pending depends strictly on guideStatus === 'Pending' or an assigned guide without a decision.
 */

/**
 * Returns true if the guide has accepted this trip request.
 * Does NOT infer acceptance from trip status (e.g. Confirmed payment).
 * 
 * @param {object} trip 
 * @returns {boolean}
 */
export function isGuideAccepted(trip) {
  return Boolean(
    trip &&
      trip.guideStatus === 'Accepted' &&
      trip.status !== 'Cancelled',
  );
}

/**
 * Returns true if the guide has declined this trip request, been cancelled, or is unassigned.
 * 
 * @param {object} trip 
 * @returns {boolean}
 */
export function isGuideDeclined(trip) {
  return Boolean(
    trip &&
      (trip.guideStatus === 'Declined' ||
        trip.guideStatus === 'Cancelled' ||
        trip.status === 'Cancelled' ||
        trip.guideId === null),
  );
}

/**
 * Returns true if the guide request is awaiting guide decision.
 * Cancelled or completed trips are NEVER pending.
 * 
 * @param {object} trip 
 * @returns {boolean}
 */
export function isGuidePending(trip) {
  if (!trip) return false;
  if (trip.status === 'Completed' || trip.status === 'Cancelled') return false;
  if (trip.guideStatus === 'Accepted' || trip.guideStatus === 'Declined' || trip.guideStatus === 'Cancelled') {
    return false;
  }
  if (trip.guideStatus === 'Pending') return true;
  return trip.guideId != null;
}

/**
 * Categorical helper returning 'Accepted' | 'Declined' | 'Cancelled' | 'Pending' | 'Unassigned'
 * 
 * @param {object} trip 
 * @returns {'Accepted' | 'Declined' | 'Cancelled' | 'Pending' | 'Unassigned'}
 */
export function getGuideRequestState(trip) {
  if (trip && (trip.status === 'Cancelled' || trip.guideStatus === 'Cancelled')) return 'Cancelled';
  if (isGuideAccepted(trip)) return 'Accepted';
  if (isGuideDeclined(trip)) return 'Declined';
  if (isGuidePending(trip)) return 'Pending';
  return 'Unassigned';
}

/**
 * Consistently resolves agency business display name.
 * Respects shared schema: agency lookup records return businessName.
 * 
 * @param {object} agency 
 * @param {number|string} [fallbackId] 
 * @returns {string}
 */
export function getAgencyDisplayName(agency, fallbackId) {
  if (!agency) {
    return fallbackId ? `Partner Agency #${fallbackId}` : 'Partner Agency';
  }
  return (
    agency.businessName ||
    agency.name ||
    agency.agencyName ||
    (fallbackId ? `Partner Agency #${fallbackId}` : 'Partner Agency')
  );
}

/**
 * Consistently resolves traveler display name.
 * 
 * @param {object} traveler 
 * @param {number|string} [fallbackId] 
 * @returns {string}
 */
export function getTravelerDisplayName(traveler, fallbackId) {
  if (!traveler) {
    return fallbackId ? `Traveler #${fallbackId}` : 'Traveler';
  }
  if (traveler.name) return traveler.name;
  const fullName = [traveler.firstName, traveler.lastName].filter(Boolean).join(' ');
  return fullName || (fallbackId ? `Traveler #${fallbackId}` : 'Traveler');
}
