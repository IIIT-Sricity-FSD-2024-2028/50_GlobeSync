import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { tripsApi, travelersApi, agenciesApi, reviewsApi } from '../../services/api';
import GuideCompletedTripCard from '../../components/guide/GuideCompletedTripCard';
import { getAgencyDisplayName, getTravelerDisplayName } from '../../components/guide/guideStateHelpers';
import './guide.css';

/**
 * GuideCompletedTripsPage
 * Route: /guide/completed-trips
 * 
 * Features:
 * - Shows current guide's Completed trips history via GET /trips/guide/:guideId
 * - Resolves client names across direct travelers and partner agencies (using businessName)
 * - Loads reviews only where permitted and strictly matches them to the corresponding trip and guide
 * - Does not invent missing ratings or earnings
 * - Real search and sorting (Newest, Oldest, Highest Rated, Lowest Rated)
 * - Review status filter tabs (All, Reviewed, Pending Review)
 * - Loading, error, secondary-data warnings, and empty states
 */
export default function GuideCompletedTripsPage() {
  const { user } = useSession();
  const guideId = user?.guideId ?? user?.id;

  const [trips, setTrips] = useState([]);
  const [reviewsMap, setReviewsMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [secondaryWarnings, setSecondaryWarnings] = useState([]);

  // Search, filter & sort controls
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'reviewed' | 'pending'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest-rating' | 'lowest-rating'

  // Fetch completed trips, travelers, agencies, and reviews
  const fetchCompletedData = async (signal) => {
    if (!guideId) {
      setIsLoading(false);
      setErrorMessage('No active guide ID found in current session.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSecondaryWarnings([]);

    try {
      const warnings = [];

      const [tripsData, travelersData, agenciesData, reviewsData] = await Promise.all([
        tripsApi.getByGuide(guideId, { signal }),
        travelersApi.getAll({ signal }).catch((err) => {
          if (err.isCancelled || signal?.aborted) throw err;
          console.warn('[GuideCompletedTrips] Could not fetch travelers:', err);
          warnings.push('Traveler directory could not be reached; traveler client names are displayed with fallback IDs.');
          return [];
        }),
        agenciesApi.getLookup({ signal }).catch((err) => {
          if (err.isCancelled || signal?.aborted) throw err;
          console.warn('[GuideCompletedTrips] Could not fetch agencies:', err);
          warnings.push('Agency directory could not be reached; partner agency business names are displayed with fallback IDs.');
          return [];
        }),
        reviewsApi.getAll({ signal }).catch((err) => {
          if (err.isCancelled || signal?.aborted) throw err;
          console.warn('[GuideCompletedTrips] Could not fetch reviews:', err);
          warnings.push('Client tour reviews could not be retrieved.');
          return [];
        }),
      ]);

      setSecondaryWarnings(warnings);

      const rawTrips = Array.isArray(tripsData) ? tripsData : [];
      const travelersList = Array.isArray(travelersData) ? travelersData : (travelersData?.value || []);
      const agenciesList = Array.isArray(agenciesData) ? agenciesData : (agenciesData?.value || []);
      const rawReviews = Array.isArray(reviewsData) ? reviewsData : (reviewsData?.value || []);

      // Filter strictly completed trips
      const completedOnly = rawTrips.filter((t) => t.status === 'Completed');

      // Build lookup maps
      const travelerMap = new Map();
      travelersList.forEach((tr) => {
        const id = tr.travelerId ?? tr.id;
        if (id) travelerMap.set(Number(id), tr);
      });

      const agencyMap = new Map();
      agenciesList.forEach((ag) => {
        const id = ag.agencyId ?? ag.id;
        if (id) agencyMap.set(Number(id), ag);
      });

      // Index reviews by tripId (strictly matching review.guideId to guideId)
      const revMap = new Map();
      rawReviews.forEach((r) => {
        if (Number(r.guideId) === Number(guideId)) {
          revMap.set(Number(r.tripId), r);
        }
      });
      setReviewsMap(revMap);

      // Enrich completed trips with client names using businessName
      const enriched = completedOnly.map((trip) => {
        let clientName = 'Direct Client';
        if (trip.agencyId) {
          const ag = agencyMap.get(Number(trip.agencyId));
          clientName = getAgencyDisplayName(ag, trip.agencyId);
        } else if (trip.travelerId) {
          const tr = travelerMap.get(Number(trip.travelerId));
          clientName = getTravelerDisplayName(tr, trip.travelerId);
        }

        return {
          ...trip,
          clientName,
        };
      });

      setTrips(enriched);
    } catch (err) {
      if (err.isCancelled) return;
      console.error('[GuideCompletedTrips] Failed to load completed trips:', err);
      setErrorMessage(err.message || 'Failed to load completed trips.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchCompletedData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [guideId]);

  // Overall Verified Summary Metrics
  const summaryMetrics = useMemo(() => {
    let reviewedCount = 0;
    let totalRatingSum = 0;

    trips.forEach((t) => {
      const rev = reviewsMap.get(Number(t.tripId));
      if (rev && typeof rev.guideRating === 'number') {
        reviewedCount += 1;
        totalRatingSum += rev.guideRating;
      }
    });

    const averageRating = reviewedCount > 0 ? (totalRatingSum / reviewedCount).toFixed(1) : null;

    return {
      totalCompleted: trips.length,
      reviewedCount,
      pendingReviewCount: trips.length - reviewedCount,
      averageRating,
    };
  }, [trips, reviewsMap]);

  // Filtered & Sorted Completed Trips
  const filteredTrips = useMemo(() => {
    return trips
      .filter((t) => {
        const hasRev = reviewsMap.has(Number(t.tripId));
        if (filterTab === 'reviewed' && !hasRev) return false;
        if (filterTab === 'pending' && hasRev) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const dest = (t.destination || '').toLowerCase();
          const client = (t.clientName || '').toLowerCase();
          const id = String(t.tripId || '');
          const code = t.agencyId ? `agy-${t.agencyId}` : `trv-${t.travelerId}`;
          return dest.includes(q) || client.includes(q) || id.includes(q) || code.includes(q);
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
        if (sortBy === 'highest-rating') {
          const ratingA = reviewsMap.get(Number(a.tripId))?.guideRating ?? -1;
          const ratingB = reviewsMap.get(Number(b.tripId))?.guideRating ?? -1;
          return ratingB - ratingA;
        }
        if (sortBy === 'lowest-rating') {
          const ratingA = reviewsMap.get(Number(a.tripId))?.guideRating ?? 99;
          const ratingB = reviewsMap.get(Number(b.tripId))?.guideRating ?? 99;
          return ratingA - ratingB;
        }
        return 0;
      });
  }, [trips, reviewsMap, filterTab, searchQuery, sortBy]);

  const handleRefresh = () => {
    const controller = new AbortController();
    fetchCompletedData(controller.signal);
  };

  return (
    <div className="guide-container">
      {/* Top Banner */}
      <div className="guide-welcome-card">
        <div>
          <h2 className="guide-welcome-title">
            ✅ Completed Trips History
          </h2>
          <p className="guide-welcome-subtitle">
            Historical portfolio of all guided tours completed by you, with verified traveler ratings and client feedback.
          </p>
        </div>

        <div className="guide-header-actions">
          <button
            type="button"
            onClick={handleRefresh}
            className="guide-refresh-btn"
            disabled={isLoading}
            title="Refresh completed trips from backend"
          >
            <span>🔄</span>
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Verified Achievement Summary Cards */}
      <div className="guide-completed-metrics-bar">
        <div className="guide-completed-metric-card">
          <div className="guide-comp-metric-label">Completed Tours</div>
          <div className="guide-comp-metric-val">{summaryMetrics.totalCompleted}</div>
          <div className="guide-comp-metric-sub">Past successful tours</div>
        </div>

        <div className="guide-completed-metric-card">
          <div className="guide-comp-metric-label">Client Reviews</div>
          <div className="guide-comp-metric-val review-accent">{summaryMetrics.reviewedCount}</div>
          <div className="guide-comp-metric-sub">
            {summaryMetrics.pendingReviewCount} pending review
          </div>
        </div>

        <div className="guide-completed-metric-card">
          <div className="guide-comp-metric-label">Verified Average Rating</div>
          <div className="guide-comp-metric-val rating-accent">
            {summaryMetrics.averageRating ? `★ ${summaryMetrics.averageRating}` : 'N/A'}
          </div>
          <div className="guide-comp-metric-sub">
            {summaryMetrics.averageRating ? 'From verified client reviews' : 'No ratings recorded yet'}
          </div>
        </div>
      </div>

      {/* Error state if fetch fails */}
      {errorMessage && (
        <div className="guide-error-banner">
          <div className="guide-error-text">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={handleRefresh} className="guide-retry-btn">
            Retry Connection
          </button>
        </div>
      )}

      {/* Secondary Data Warnings Banner */}
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
          <div className="guide-search-box">
            <span className="guide-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search destination, client name, trip ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="guide-search-input"
            />
          </div>

          <div className="guide-filter-tabs">
            <button
              type="button"
              className={`guide-filter-tab ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              <span>All Tours</span>
              <span className="guide-tab-count">{summaryMetrics.totalCompleted}</span>
            </button>
            <button
              type="button"
              className={`guide-filter-tab ${filterTab === 'reviewed' ? 'active' : ''}`}
              onClick={() => setFilterTab('reviewed')}
            >
              <span>With Reviews</span>
              <span className="guide-tab-count">{summaryMetrics.reviewedCount}</span>
            </button>
            <button
              type="button"
              className={`guide-filter-tab ${filterTab === 'pending' ? 'active' : ''}`}
              onClick={() => setFilterTab('pending')}
            >
              <span>Pending Review</span>
              <span className="guide-tab-count">{summaryMetrics.pendingReviewCount}</span>
            </button>
          </div>
        </div>

        <div className="guide-sort-control">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="guide-sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest-rating">Highest Rating</option>
            <option value="lowest-rating">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* Content Rendering: Loading vs List/Empty */}
      {isLoading && !errorMessage ? (
        <div className="guide-state-card">
          <div className="guide-spinner" />
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Loading completed tours history...
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Retrieving past assignments and verified traveler reviews
          </div>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="card guide-empty-card">
          <div style={{ fontSize: '54px', marginBottom: '16px' }}>🏁</div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
            No Completed Tours Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '440px', margin: '0 auto' }}>
            {trips.length === 0
              ? 'You have not completed any tours yet. When you complete an active tour, it will appear here in your permanent record.'
              : 'No completed tours match your search query or review filter tab.'}
          </p>
        </div>
      ) : (
        <div className="guide-completed-trips-list">
          {filteredTrips.map((trip) => (
            <GuideCompletedTripCard
              key={trip.tripId}
              trip={trip}
              review={reviewsMap.get(Number(trip.tripId)) || null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
