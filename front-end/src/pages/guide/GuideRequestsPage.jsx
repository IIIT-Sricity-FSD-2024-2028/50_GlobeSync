import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { tripsApi, travelersApi, agenciesApi, messagesApi } from '../../services/api';
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
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [secondaryWarnings, setSecondaryWarnings] = useState([]);

  // Filter & Search & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'accepted' | 'all'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'budget-high' | 'budget-low'

  // Per-trip action states: { [tripId]: 'accepting' | 'declining' | 'notifying' }
  const [actionLoading, setActionLoading] = useState({});

  // Decoupled notification errors: { [tripId]: { message: string, payload: object } }
  const [notificationErrors, setNotificationErrors] = useState({});

  // Top feedback alert banner
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'warning' | 'error', message: string }

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
      const [tripsData, travelersData, agenciesData] = await Promise.all([
        tripsApi.getByGuide(guideId, { signal }),
        travelersApi.getAll({ signal }).catch((err) => {
          if (err.isCancelled || signal?.aborted) throw err;
          console.warn('[GuideRequestsPage] Could not fetch travelers list:', err);
          warnings.push('Traveler directory could not be reached; traveler client names are displayed with fallback IDs.');
          return [];
        }),
        agenciesApi.getLookup({ signal }).catch((err) => {
          if (err.isCancelled || signal?.aborted) throw err;
          console.warn('[GuideRequestsPage] Could not fetch agencies lookup:', err);
          warnings.push('Agency directory could not be reached; partner agency business names are displayed with fallback IDs.');
          return [];
        }),
      ]);

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

      setTrips(enrichedTrips);
    } catch (err) {
      if (err.isCancelled) return;
      console.error('[GuideRequestsPage] Failed to fetch requests:', err);
      setFetchError(err.message || 'Failed to load trip requests.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mount effect
  useEffect(() => {
    const controller = new AbortController();
    fetchRequestsData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [guideId]);

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

  // Accept Handler
  const handleAccept = async (trip) => {
    const tripId = trip.tripId;
    if (actionLoading[tripId]) return; // Prevent double-clicks

    setActionLoading((prev) => ({ ...prev, [tripId]: 'accepting' }));
    setFeedback(null);

    try {
      // 1. Perform backend trip update with guideStatus extension
      // Coherent decision: guideStatus = 'Accepted', keeping trip status aligned without falsely declaring payment
      await tripsApi.update(tripId, { guideStatus: 'Accepted' });

      // Update state locally immediately
      setTrips((prev) =>
        prev.map((t) => (t.tripId === tripId ? { ...t, guideStatus: 'Accepted' } : t))
      );

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
        await messagesApi.create(notificationPayload);
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

  // Decline Handler
  const handleDecline = async (trip) => {
    const tripId = trip.tripId;
    if (actionLoading[tripId]) return; // Prevent double-clicks

    const confirmed = window.confirm(
      `Are you sure you want to decline the request for ${trip.destination} (Trip #${tripId})?\n\nThis will decline the request without modifying trip payment or booking status.`
    );
    if (!confirmed) return;

    setActionLoading((prev) => ({ ...prev, [tripId]: 'declining' }));
    setFeedback(null);

    try {
      // 1. Perform backend trip update to mark guideStatus as Declined
      // Does NOT force status: 'Planning' to avoid invalid FSM transitions on Confirmed/Pending trips
      await tripsApi.update(tripId, {
        guideStatus: 'Declined',
      });

      // Update state locally immediately
      setTrips((prev) =>
        prev.map((t) =>
          t.tripId === tripId
            ? { ...t, guideStatus: 'Declined' }
            : t
        )
      );

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
        await messagesApi.create(notificationPayload);
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
      // ONLY calls messagesApi.create - DOES NOT touch or re-run trip update logic
      await messagesApi.create(errorRecord.payload);

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
    </div>
  );
}
