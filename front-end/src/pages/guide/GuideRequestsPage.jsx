import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import { useResource } from '../../store/hooks';
import GuideRequestList from '../../components/guide/GuideRequestList';
import {
  isGuideAccepted,
  isGuidePending,
  isGuideDeclined,
  getAgencyDisplayName,
  getTravelerDisplayName,
} from '../../components/guide/guideStateHelpers';
import './guide.css';

/**
 * GuideRequestsPage
 * Primary route: /guide/requests
 * 
 * Features:
 * - Fetches trips assigned to the logged-in guide via GET /trips/guide/:guideId
 * - Resolves requestor names via GET /travelers and GET /agencies/lookup (using businessName)
 * - Handles both traveler-owned and agency-owned trips
 * - Coherent Guide Acceptance vs Payment: Guide accepting sets guideStatus = 'Accepted'
 *   without prematurely marking trip payment as confirmed.
 * - Decline behavior: Sets guideStatus = 'Declined' without invalid FSM status transitions
 *   or deleting the trip or unrelated bookings.
 * - Decoupled decisions and notifications: If notification fails, trip decision is saved
 *   and an isolated 'Retry Notification' action is offered. Retrying only sends the message.
 * - Displays secondary data warnings when travelers or agencies lookups fail.
 * - Rapid-click prevention with loading state flags per trip.
 * - Search by destination, requestor name, trip ID, or code.
 * - Filter tabs (Pending, Accepted, All) with live badges based on guideStatus.
 * - Sorting by Newest, Oldest, Budget (High to Low), Budget (Low to High).
 */
export default function GuideRequestsPage() {
  const { user } = useSession();
  const guideId = user?.guideId ?? user?.id;

  // Primary data state
  const tripResource = useResource('trips', { scope: 'getByGuide', id: guideId }, { load: Boolean(guideId) });
  const messageResource = useResource('messages', undefined, { load: false });
  const travelerResource = useResource('travelers');
  const agencyResource = useResource('agencies', { scope: 'getLookup' }, { load: false });
  const trips = tripResource.items;
  const isLoading = tripResource.status === 'loading';
  const fetchError = tripResource.error;
  const [secondaryWarnings, setSecondaryWarnings] = useState([]);

  // Filter & Search & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'accepted' | 'all'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'budget-high' | 'budget-low'

  // Per-trip action states: { [tripId]: 'accepting' | 'declining' | 'notifying' }
  const [actionLoading, setActionLoading] = useState({});

  // Pending Guide Reassignment Offers (Category D Governance)
  const [pendingReassignments, setPendingReassignments] = useState([]);
  const [reassignBusy, setReassignBusy] = useState(false);

  // Decoupled notification errors: { [tripId]: { message: string, payload: object } }
  const [notificationErrors, setNotificationErrors] = useState({});

  // Top feedback alert banner
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'warning' | 'error', message: string }

  // Reason modal for accept/decline actions
  const [reasonModal, setReasonModal] = useState(null); // { trip, action: 'accept' | 'decline' }
  const [reasonText, setReasonText] = useState('');

  // Fetch guide trips and resolve requestor names
  const fetchRequestsData = async (signal) => {
    if (!guideId) {
      setIsLoading(false);
      setFetchError('No active guide ID found in current session.');
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    setSecondaryWarnings([]);

    try {
      const warnings = [];

      // Concurrently fetch guide trips, travelers, and agencies lookup
      const [tripsData, travelersData, agenciesData, myReassignments] = await Promise.all([
        tripResource.refresh(),
        travelerResource.refresh().catch((err) => {
          if (err.isCancelled || signal?.aborted) throw err;
          console.warn('[GuideRequestsPage] Could not fetch travelers list:', err);
          warnings.push('Traveler directory could not be reached; traveler client names are displayed with fallback IDs.');
          return [];
        }),
        agencyResource.refresh().catch((err) => {
          if (err.isCancelled || signal?.aborted) throw err;
          console.warn('[GuideRequestsPage] Could not fetch agencies lookup:', err);
          warnings.push('Agency directory could not be reached; partner agency business names are displayed with fallback IDs.');
          return [];
        }),
        tripResource.getMyReassignments().catch(() => []),
      ]);

      const pendingOffers = Array.isArray(myReassignments)
        ? myReassignments.filter(
            (r) =>
              r.proposedGuideId === Number(guideId) &&
              r.status === 'TRAVELER_ACCEPTED' &&
              (r.guideConsent === 'PENDING' || !r.guideConsent),
          )
        : [];
      setPendingReassignments(pendingOffers);

      setSecondaryWarnings(warnings);

      const rawTrips = Array.isArray(tripsData) ? tripsData : [];
      const travelersList = Array.isArray(travelersData) ? travelersData : (travelersData?.value || []);
      const agenciesList = Array.isArray(agenciesData) ? agenciesData : (agenciesData?.value || []);

      // Build lookup maps for fast resolution
      const travelerMap = new Map();
      travelersList.forEach((t) => {
        const id = t.travelerId ?? t.id;
        if (id) travelerMap.set(Number(id), t);
      });

      const agencyMap = new Map();
      agenciesList.forEach((a) => {
        const id = a.agencyId ?? a.id;
        if (id) agencyMap.set(Number(id), a);
      });

      // Enrich trips with resolved requestor names using businessName
      const enrichedTrips = rawTrips.map((trip) => {
        let requestorName = 'Direct Traveler';
        if (trip.agencyId) {
          const agency = agencyMap.get(Number(trip.agencyId));
          requestorName = getAgencyDisplayName(agency, trip.agencyId);
        } else if (trip.travelerId) {
          const traveler = travelerMap.get(Number(trip.travelerId));
          requestorName = getTravelerDisplayName(traveler, trip.travelerId);
        }

        return {
          ...trip,
          requestorName,
        };
      });

      tripResource.replaceAll(enrichedTrips);
    } catch (err) {
      if (err.isCancelled) return;
      console.error('[GuideRequestsPage] Failed to fetch requests:', err);
      console.error(err);
    }
  };

  // Mount effect
  useEffect(() => {
    fetchRequestsData();
  }, [guideId]);

  // Realtime updates without full page reload
  useRealtimeEvent('guide_request.created', (event) => {
    if (event?.trip) {
      tripResource.upsert({ ...event.trip, requestorName: 'New Client Request' });
      setFeedback({
        type: 'success',
        message: `⚡ Live Update: New trip request received for ${event.destination || event.trip.destination}!`,
      });
    }
  });

  useRealtimeEvent('guide_request.accepted', (event) => {
    if (event?.tripId) {
      tripResource.upsert({ tripId: event.tripId, guideStatus: 'Accepted' });
    }
  });

  useRealtimeEvent('guide_request.declined', (event) => {
    if (event?.tripId) {
      tripResource.upsert({ tripId: event.tripId, guideStatus: 'Declined' });
    }
  });

  // Tab counts calculation
  const counts = useMemo(() => {
    let pending = 0;
    let accepted = 0;

    trips.forEach((t) => {
      if (isGuideAccepted(t)) {
        accepted += 1;
      } else if (isGuidePending(t)) {
        pending += 1;
      }
    });

    return {
      pending,
      accepted,
      all: trips.length,
    };
  }, [trips]);

  // Filtered and sorted trips
  const filteredTrips = useMemo(() => {
    return trips
      .filter((t) => {
        // Tab filtering using canonical guide request state
        if (activeTab === 'pending') {
          if (!isGuidePending(t)) return false;
        } else if (activeTab === 'accepted') {
          if (!isGuideAccepted(t)) return false;
        }

        // Search query matching
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const dest = (t.destination || '').toLowerCase();
          const req = (t.requestorName || '').toLowerCase();
          const id = String(t.tripId || '');
          const code = t.agencyId ? `agy-${t.agencyId}` : `trv-${t.travelerId}`;

          return dest.includes(q) || req.includes(q) || id.includes(q) || code.includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return Number(b.tripId) - Number(a.tripId);
        }
        if (sortBy === 'oldest') {
          return Number(a.tripId) - Number(b.tripId);
        }
        if (sortBy === 'budget-high') {
          return Number(b.budget || 0) - Number(a.budget || 0);
        }
        if (sortBy === 'budget-low') {
          return Number(a.budget || 0) - Number(b.budget || 0);
        }
        return 0;
      });
  }, [trips, activeTab, searchQuery, sortBy]);

  // Accept Handler — opens reason modal first
  const handleAccept = (trip) => {
    setReasonText('');
    setReasonModal({ trip, action: 'accept' });
  };

  // Actual accept commit after modal confirm
  const commitAccept = async (trip, reason) => {
    const tripId = trip.tripId;
    setReasonModal(null);
    if (actionLoading[tripId]) return;

    setActionLoading((prev) => ({ ...prev, [tripId]: 'accepting' }));
    setFeedback(null);

    try {
      // 1. Perform backend trip update with guideStatus extension + optional reason
      await tripResource.update(tripId, {
        guideStatus: 'Accepted',
        ...(reason?.trim() ? { guideDecisionReason: reason.trim() } : {}),
      });

      // Update state locally immediately
      tripResource.upsert({ tripId, guideStatus: 'Accepted', guideDecisionReason: reason?.trim() || undefined });

      // 2. Decoupled notification attempt
      setActionLoading((prev) => ({ ...prev, [tripId]: 'notifying' }));
      const notificationPayload = {
        sender: 'guide',
        senderId: Number(guideId),
        receiver: trip.agencyId ? 'agency' : 'traveler',
        receiverId: Number(trip.agencyId || trip.travelerId),
        content: `Your tour request for ${trip.destination} (Trip #${tripId}) has been accepted by guide ${user?.name || 'Devansh'}.`,
      };

      try {
        await messageResource.create(notificationPayload);
        // Clear any previous notification error for this trip
        setNotificationErrors((prev) => {
          const copy = { ...prev };
          delete copy[tripId];
          return copy;
        });
        setFeedback({
          type: 'success',
          message: `Trip #${tripId} successfully accepted and notification sent to ${trip.requestorName}.`,
        });
      } catch (notifErr) {
        console.warn(`[GuideRequestsPage] Notification failed for Trip #${tripId}:`, notifErr);
        // Decision is saved, but notification failed
        setNotificationErrors((prev) => ({
          ...prev,
          [tripId]: {
            message: notifErr.message || 'Notification message failed to deliver.',
            payload: notificationPayload,
          },
        }));
        setFeedback({
          type: 'warning',
          message: `Trip #${tripId} accepted successfully, but delivery of the confirmation message failed. Use the Retry button on the card to resend it.`,
        });
      }
    } catch (updateErr) {
      console.error(`[GuideRequestsPage] Failed to accept Trip #${tripId}:`, updateErr);
      setFeedback({
        type: 'error',
        message: updateErr.message || `Failed to accept Trip #${tripId}. Please try again.`,
      });
    } finally {
      setActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[tripId];
        return copy;
      });
    }
  };

  // Decline Handler — opens reason modal first
  const handleDecline = (trip) => {
    setReasonText('');
    setReasonModal({ trip, action: 'decline' });
  };

  // Actual decline commit after modal confirm
  const commitDecline = async (trip, reason) => {
    const tripId = trip.tripId;
    setReasonModal(null);
    if (actionLoading[tripId]) return; // Prevent double-clicks

    setActionLoading((prev) => ({ ...prev, [tripId]: 'declining' }));
    setFeedback(null);

    try {
      // 1. Perform backend trip update to mark guideStatus as Declined with optional reason
      await tripResource.update(tripId, {
        guideStatus: 'Declined',
        ...(reason?.trim() ? { guideDecisionReason: reason.trim() } : {}),
      });

      // Update state locally immediately
      tripResource.upsert({ tripId, guideStatus: 'Declined', guideDecisionReason: reason?.trim() || undefined });

      // 2. Decoupled notification attempt
      setActionLoading((prev) => ({ ...prev, [tripId]: 'notifying' }));
      const notificationPayload = {
        sender: 'guide',
        senderId: Number(guideId),
        receiver: trip.agencyId ? 'agency' : 'traveler',
        receiverId: Number(trip.agencyId || trip.travelerId),
        content: `Guide assignment for ${trip.destination} (Trip #${tripId}) was declined by ${user?.name || 'the guide'}.`,
      };

      try {
        await messageResource.create(notificationPayload);
        // Clear any previous notification error for this trip
        setNotificationErrors((prev) => {
          const copy = { ...prev };
          delete copy[tripId];
          return copy;
        });
        setFeedback({
          type: 'success',
          message: `Trip #${tripId} was declined and a notice was sent to ${trip.requestorName}.`,
        });
      } catch (notifErr) {
        console.warn(`[GuideRequestsPage] Notification failed for declined Trip #${tripId}:`, notifErr);
        // Decision is saved, but notification failed
        setNotificationErrors((prev) => ({
          ...prev,
          [tripId]: {
            message: notifErr.message || 'Notification message failed to deliver.',
            payload: notificationPayload,
          },
        }));
        setFeedback({
          type: 'warning',
          message: `Trip #${tripId} declined successfully, but notification message failed to deliver. You can retry sending it.`,
        });
      }
    } catch (declineErr) {
      console.error(`[GuideRequestsPage] Failed to decline Trip #${tripId}:`, declineErr);
      setFeedback({
        type: 'error',
        message: declineErr.message || `Failed to decline Trip #${tripId}. Please check permissions.`,
      });
    } finally {
      setActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[tripId];
        return copy;
      });
    }
  };

  // Isolated Retry Notification Handler
  const handleRetryNotification = async (tripId) => {
    const errorRecord = notificationErrors[tripId];
    if (!errorRecord || !errorRecord.payload) return;
    if (actionLoading[tripId]) return;

    setActionLoading((prev) => ({ ...prev, [tripId]: 'notifying' }));

    try {
      // Only creates the notification through the Redux message resource.
      await messageResource.create(errorRecord.payload);

      // Remove from notificationErrors on success
      setNotificationErrors((prev) => {
        const copy = { ...prev };
        delete copy[tripId];
        return copy;
      });

      setFeedback({
        type: 'success',
        message: `Notification for Trip #${tripId} delivered successfully.`,
      });
    } catch (retryErr) {
      console.error(`[GuideRequestsPage] Retry notification failed for Trip #${tripId}:`, retryErr);
      setNotificationErrors((prev) => ({
        ...prev,
        [tripId]: {
          ...prev[tripId],
          message: retryErr.message || 'Retry delivery failed. Please check connection.',
        },
      }));
      setFeedback({
        type: 'error',
        message: `Failed to deliver notification for Trip #${tripId}: ${retryErr.message}`,
      });
    } finally {
      setActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[tripId];
        return copy;
      });
    }
  };

  const handleRespondReassignment = async (requestId, accept, notes) => {
    setReassignBusy(true);
    try {
      await tripResource.respondGuideAssignment([requestId, {
        decision: accept ? 'ACCEPT' : 'DECLINE',
        reason: notes,
      }]);
      setFeedback({
        type: 'success',
        message: accept ? 'Reassignment offer accepted!' : 'Reassignment offer declined.',
      });
      setPendingReassignments((prev) => prev.filter((r) => r.id !== requestId));
      const controller = new AbortController();
      fetchRequestsData(controller.signal);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit reassignment response.',
      });
    } finally {
      setReassignBusy(false);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    const controller = new AbortController();
    fetchRequestsData(controller.signal);
  };

  return (
    <div className="guide-container">
      {/* Top Welcome / Header Banner */}
      <div className="guide-welcome-card">
        <div>
          <h2 className="guide-welcome-title">
            📥 Trip Requests
          </h2>
          <p className="guide-welcome-subtitle">
            Review incoming traveler and agency tour invitations, accept bookings, or decline unaligned requests.
          </p>
        </div>

        <div className="guide-header-actions">
          <button
            type="button"
            onClick={handleRefresh}
            className="guide-refresh-btn"
            disabled={isLoading}
            title="Refresh trip requests from backend"
          >
            <span>🔄</span>
            <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Alert Banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background:
              feedback.type === 'success'
                ? '#ecfdf5'
                : feedback.type === 'warning'
                ? '#fffbeb'
                : '#fef2f2',
            color:
              feedback.type === 'success'
                ? '#065f46'
                : feedback.type === 'warning'
                ? '#92400e'
                : '#991b1b',
            border: `1px solid ${
              feedback.type === 'success'
                ? '#a7f3d0'
                : feedback.type === 'warning'
                ? '#fde68a'
                : '#fecaca'
            }`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{feedback.type === 'success' ? '✓' : feedback.type === 'warning' ? '⚠️' : '✕'}</span>
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              color: 'inherit',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Pending Guide Replacement Assignment Offers (Category D Governance) */}
      {pendingReassignments.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {pendingReassignments.map((req) => (
            <div
              key={req.id}
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderLeft: '5px solid #3b82f6',
                marginBottom: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '15px' }}>
                  🎯 Administrative Tour Assignment Offer: Trip #{req.tripId}
                  {req.tripDestination ? ` (${req.tripDestination})` : ''}
                </span>
                <span style={{ fontSize: '12px', color: '#3b82f6' }}>
                  Requested {new Date(req.createdAt).toLocaleDateString()}
                  {req.expiresAt ? ` • Expires ${new Date(req.expiresAt).toLocaleDateString()}` : ''}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e3a8a' }}>
                You have been nominated by Administration (and approved by the traveler) as the lead tour guide for Trip #{req.tripId}
                {req.tripStartDate && req.tripEndDate ? ` (${req.tripStartDate} → ${req.tripEndDate})` : ''}.
                {req.proposedGuideDailyRate ? ` Daily rate: ₹${Number(req.proposedGuideDailyRate).toLocaleString('en-IN')}/day.` : ''}
                <br />
                <strong>Reason:</strong> "{req.reason}"
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={reassignBusy}
                  onClick={() => handleRespondReassignment(req.id, true, 'Guide accepted tour assignment')}
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                >
                  ✓ Accept Tour Assignment
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={reassignBusy}
                  onClick={() => handleRespondReassignment(req.id, false, 'Guide declined due to schedule conflict')}
                  style={{ color: '#dc2626' }}
                >
                  ✕ Decline Assignment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state if initial fetch fails */}
      {fetchError && (
        <div className="guide-error-banner">
          <div className="guide-error-text">
            <span>⚠️</span>
            <span>{fetchError}</span>
          </div>
          <button type="button" onClick={handleRefresh} className="guide-retry-btn">
            Retry Loading
          </button>
        </div>
      )}

      {/* Secondary data warning banner */}
      {secondaryWarnings.length > 0 && (
        <div
          role="alert"
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 500,
            background: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fde68a',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '16px',
          }}
        >
          {secondaryWarnings.map((warning, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search, Filter Tabs & Sort Controls */}
      <div className="guide-requests-topbar">
        <div className="guide-search-filter-row">
          {/* Search box */}
          <div className="guide-search-box">
            <span className="guide-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search destination, requestor, trip ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="guide-search-input"
            />
          </div>

          {/* Filter tabs */}
          <div className="guide-filter-tabs">
            <button
              type="button"
              className={`guide-filter-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <span>Pending Requests</span>
              <span className="guide-tab-count">{counts.pending}</span>
            </button>
            <button
              type="button"
              className={`guide-filter-tab ${activeTab === 'accepted' ? 'active' : ''}`}
              onClick={() => setActiveTab('accepted')}
            >
              <span>Accepted</span>
              <span className="guide-tab-count">{counts.accepted}</span>
            </button>
            <button
              type="button"
              className={`guide-filter-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>All Requests</span>
              <span className="guide-tab-count">{counts.all}</span>
            </button>
          </div>
        </div>

        {/* Sorting control */}
        <div className="guide-sort-control">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="guide-sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="budget-high">Budget: High to Low</option>
            <option value="budget-low">Budget: Low to High</option>
          </select>
        </div>
      </div>

      {/* Content Rendering: Loading vs List/Empty */}
      {isLoading && !fetchError ? (
        <div className="guide-state-card">
          <div className="guide-spinner" />
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Loading trip requests...
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Fetching assigned tours and requestor information
          </div>
        </div>
      ) : (
        <GuideRequestList
          requests={filteredTrips}
          actionLoading={actionLoading}
          notificationErrors={notificationErrors}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onRetryNotification={handleRetryNotification}
        />
      )}

      {/* Decision Reason Modal */}
      {reasonModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '480px',
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700 }}>
              {reasonModal.action === 'accept' ? 'Accept Tour Request' : 'Decline Tour Request'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              {reasonModal.action === 'accept'
                ? `You are accepting Trip #${reasonModal.trip.tripId} to ${reasonModal.trip.destination}. Optionally include a message or note:`
                : `You are declining Trip #${reasonModal.trip.tripId} to ${reasonModal.trip.destination}. Please provide an optional reason:`}
            </p>
            <textarea
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder={reasonModal.action === 'accept' ? 'Looking forward to guiding you... (optional)' : 'e.g. Scheduling conflict, fully booked... (optional)'}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                marginBottom: '16px',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setReasonModal(null); setReasonText(''); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (reasonModal.action === 'accept') {
                    commitAccept(reasonModal.trip, reasonText);
                  } else {
                    commitDecline(reasonModal.trip, reasonText);
                  }
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: reasonModal.action === 'accept' ? '#10b981' : '#ef4444',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {reasonModal.action === 'accept' ? 'Confirm Acceptance' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
