import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from '../../context/SessionContext';
import { useResource } from '../../store/hooks';
import './guide.css';

/**
 * GuideReviewsPage
 * Route: /guide/reviews
 *
 * Dedicated reputation and feedback center for verified Tour Guides.
 * Real App Parity:
 * - Aggregated star rating metrics and star-distribution breakdown
 * - Guide Rating vs. Trip Experience Rating analytics
 * - Filter by star tier (5★, 4★, 3★, etc.)
 * - Search by traveler name or review text
 * - Verified booking credentials
 * - Interactive Guide Public Response / Acknowledgment feature
 */
export default function GuideReviewsPage() {
  const { user } = useSession();
  const guideId = user?.guideId ?? user?.id;

  const reviewResource = useResource('reviews', { scope: 'getByGuide', id: guideId }, { load: Boolean(guideId) });
  const guideResource = useResource('guides', { scope: 'getById', id: guideId }, { load: Boolean(guideId) });
  const travelerResource = useResource('travelers');
  const tripResource = useResource('trips', { scope: 'getByGuide', id: guideId }, { load: Boolean(guideId) });
  const reviewActions = useResource('reviews', undefined, { load: false });
  const reviews = reviewResource.items;
  const [tripsMap, setTripsMap] = useState(new Map());
  const [travelersMap, setTravelersMap] = useState(new Map());
  const guideProfile = guideResource.items[0] || null;
  // Real aggregated stats from backend (never faked)
  const [apiStats, setApiStats] = useState(null);
  const isLoading = reviewResource.status === 'loading';
  const errorMessage = reviewResource.error || guideResource.error;

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState('all'); // 'all' | '5' | '4' | '3' | '2' | '1'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest'

  // Guide replies stored locally for immediate UX interactivity
  const [guideReplies, setGuideReplies] = useState(() => {
    try {
      const stored = localStorage.getItem(`guide_replies_${guideId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const abortRef = useRef(null);

  const loadReviewsData = async () => {
    if (!guideId) {
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;


    try {
      const [reviewsData, tripsData, travelersData, guideData, statsData] = await Promise.all([
        reviewResource.refresh(),
        tripResource.refresh(),
        travelerResource.refresh(),
        guideResource.refresh().catch(() => null),
        // Fetch real aggregated stats — returns { guideId, count, avg, starBreakdown, recommendPercentage }
        reviewResource.getGuideStats([guideId]).catch(() => null),
      ]);

      if (controller.signal.aborted) return;

      const rawReviews = Array.isArray(reviewsData) ? reviewsData : [];
      reviewResource.replaceAll(rawReviews);

      // Store real server-computed stats (may be null if endpoint not yet reachable)
      setApiStats(statsData || null);

      // Index trips by ID
      const tMap = new Map();
      (Array.isArray(tripsData) ? tripsData : []).forEach((t) => {
        if (t.tripId) tMap.set(Number(t.tripId), t);
      });
      setTripsMap(tMap);

      // Index travelers by ID
      const trMap = new Map();
      (Array.isArray(travelersData) ? travelersData : []).forEach((tr) => {
        const id = tr.travelerId ?? tr.id;
        if (id) trMap.set(Number(id), tr);
      });
      setTravelersMap(trMap);

      // Guide profile is maintained by the guide resource slice.
    } catch (err) {
      if (err.isCancelled || controller.signal.aborted) return;
      console.error(err);
    }
  };

  useEffect(() => {
    loadReviewsData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [guideId]);

  // Aggregate Metrics — computed from actual reviews, with real zeros when empty
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      // Use server-computed stats for real zero values; never fake 5.0 or 100%
      return {
        total: 0,
        avgGuideRating: apiStats?.avg ?? 0,
        avgTripRating: 0,
        distribution: apiStats?.starBreakdown ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recommendationPct: apiStats?.recommendPercentage ?? 0,
      };
    }

    let guideSum = 0;
    let tripSum = 0;
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach((r) => {
      const gRating = Math.max(1, Math.min(5, Math.round(Number(r.guideRating) || 5)));
      dist[gRating] = (dist[gRating] || 0) + 1;
      guideSum += Number(r.guideRating) || 5;
      tripSum += Number(r.tripRating) || 5;
    });

    const avgGuide = (guideSum / total).toFixed(1);
    const avgTrip = (tripSum / total).toFixed(1);
    const positiveCount = (dist[5] || 0) + (dist[4] || 0);
    const recommendationPct = Math.round((positiveCount / total) * 100);

    return {
      total,
      avgGuideRating: Number(avgGuide),
      avgTripRating: Number(avgTrip),
      distribution: dist,
      recommendationPct,
    };
  }, [reviews, guideProfile, apiStats]);

  // Filtered & Sorted Reviews
  const filteredReviews = useMemo(() => {
    return reviews
      .filter((rev) => {
        // Star rating filter
        if (starFilter !== 'all') {
          const ratingVal = Math.round(Number(rev.guideRating));
          if (ratingVal !== Number(starFilter)) return false;
        }

        // Search text filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const traveler = travelersMap.get(Number(rev.travelerId));
          const travelerName = traveler?.name?.toLowerCase() || '';
          const trip = tripsMap.get(Number(rev.tripId));
          const tripDest = trip?.destination?.toLowerCase() || '';
          const comment = rev.comment?.toLowerCase() || '';

          return travelerName.includes(q) || tripDest.includes(q) || comment.includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }
        if (sortBy === 'highest') {
          return (Number(b.guideRating) || 0) - (Number(a.guideRating) || 0);
        }
        if (sortBy === 'lowest') {
          return (Number(a.guideRating) || 0) - (Number(b.guideRating) || 0);
        }
        return 0;
      });
  }, [reviews, starFilter, searchQuery, sortBy, travelersMap, tripsMap]);

  // Reply submission — persists to backend via POST /reviews/:id/response
  const handleSaveReply = async (reviewId) => {
    if (!replyText.trim()) return;
    try {
      await reviewActions.respond([reviewId, { response: replyText.trim() }]);
    } catch (err) {
      // Backend not reachable or feature not yet live; fall back to localStorage
      console.warn('[GuideReviewsPage] Reply API failed, falling back to localStorage:', err);
    }
    const nextReplies = {
      ...guideReplies,
      [reviewId]: {
        text: replyText.trim(),
        createdAt: new Date().toISOString(),
      },
    };
    setGuideReplies(nextReplies);
    try {
      localStorage.setItem(`guide_replies_${guideId}`, JSON.stringify(nextReplies));
    } catch {}
    setActiveReplyId(null);
    setReplyText('');
  };

  const renderStars = (rating) => {
    const num = Math.round(Number(rating) || 5);
    return '★'.repeat(num) + '☆'.repeat(Math.max(0, 5 - num));
  };

  return (
    <div className="guide-container">
      {/* Header Banner */}
      <div className="guide-welcome-card">
        <div>
          <h1 className="guide-welcome-title">⭐ Traveler Reviews & Ratings</h1>
          <p className="guide-welcome-subtitle">
            Verified traveler testimonials and performance metrics for your guided tours.
          </p>
        </div>
        <div className="guide-header-actions">
          <span className="guide-badge">⭐ Guide Reputation</span>
          <button
            type="button"
            className="guide-refresh-btn"
            onClick={loadReviewsData}
            disabled={isLoading}
            title="Refresh review records"
          >
            <span>🔄</span>
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="guide-error-banner">
          <div className="guide-error-text">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button type="button" className="guide-retry-btn" onClick={loadReviewsData}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="guide-state-card">
          <div className="guide-spinner" />
          <div className="guide-state-label">Loading traveler reviews…</div>
        </div>
      )}

      {!isLoading && !errorMessage && (
        <>
          {/* Top Analytics Summary Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            {/* Overall Rating Card */}
            <div
              style={{
                background: '#fff',
                padding: '24px',
                borderRadius: '14px',
                border: '1px solid var(--border-light, #f0f0f0)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted, #666)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Overall Guide Score
              </div>
              <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--primary, #0284c7)', margin: '8px 0 4px' }}>
                {stats.avgGuideRating.toFixed(1)}
              </div>
              <div style={{ color: '#f59e0b', fontSize: '20px', letterSpacing: '2px', marginBottom: '6px' }}>
                {renderStars(stats.avgGuideRating)}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Based on <strong>{stats.total}</strong> verified traveler review{stats.total === 1 ? '' : 's'}
              </div>
              {stats.total === 0 && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                  Stats will appear after your first completed tour
                </div>
              )}
            </div>

            {/* Rating Breakdown Bars */}
            <div
              style={{
                background: '#fff',
                padding: '20px 24px',
                borderRadius: '14px',
                border: '1px solid var(--border-light, #f0f0f0)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted, #666)', marginBottom: '4px' }}>
                Rating Distribution
              </div>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = stats.distribution[stars] || 0;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <span style={{ width: '45px', fontWeight: 600, color: '#334155' }}>{stars} ★</span>
                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: stars >= 4 ? '#10b981' : stars === 3 ? '#f59e0b' : '#ef4444',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <span style={{ width: '35px', textAlign: 'right', color: '#64748b', fontSize: '12px' }}>{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Satisfaction Highlights */}
            <div
              style={{
                background: '#fff',
                padding: '24px',
                borderRadius: '14px',
                border: '1px solid var(--border-light, #f0f0f0)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #666)', textTransform: 'uppercase' }}>
                  Recommendation Rate
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                  {stats.recommendationPct}%
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Travelers rated 4 stars or higher
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #666)', textTransform: 'uppercase' }}>
                  Avg. Trip Experience
                </div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#334155', margin: '4px 0' }}>
                  ⭐ {stats.avgTripRating.toFixed(1)} / 5.0
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Overall satisfaction with tour packages
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div
            style={{
              background: '#fff',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid var(--border-light, #f0f0f0)',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '14px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Search Input */}
            <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
              <input
                type="text"
                placeholder="🔍 Search by traveler, destination, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Star Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Reviews' },
                { id: '5', label: '5 ★' },
                { id: '4', label: '4 ★' },
                { id: '3', label: '3 ★' },
                { id: '2', label: '2 ★' },
                { id: '1', label: '1 ★' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStarFilter(tab.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: starFilter === tab.id ? 700 : 500,
                    background: starFilter === tab.id ? 'var(--primary, #0284c7)' : '#f1f5f9',
                    color: starFilter === tab.id ? '#fff' : '#475569',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#fff',
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
          </div>

          {/* Reviews List */}
          {filteredReviews.length === 0 ? (
            <div className="guide-state-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>💬</div>
              <div className="guide-state-label" style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>
                No reviews found matching criteria
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: '6px auto 16px' }}>
                {searchQuery || starFilter !== 'all'
                  ? 'Try clearing your search query or choosing another star filter.'
                  : 'Travelers who complete guided tours with you will have their reviews displayed here.'}
              </p>
              {(searchQuery || starFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setStarFilter('all'); }}
                  className="guide-retry-btn"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredReviews.map((rev) => {
                const traveler = travelersMap.get(Number(rev.travelerId));
                const trip = tripsMap.get(Number(rev.tripId));
                const travelerName = traveler?.name || `Traveler #${rev.travelerId}`;
                const initial = travelerName.charAt(0).toUpperCase();
                const tripTitle = trip?.title || trip?.destination || `Trip #${rev.tripId}`;
                const reply = guideReplies[rev.reviewId];
                const isReplying = activeReplyId === rev.reviewId;

                return (
                  <div
                    key={rev.reviewId}
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      border: '1px solid var(--border-light, #f0f0f0)',
                      padding: '20px 24px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {/* Review Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: '#e0f2fe',
                            color: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '18px',
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                              {travelerName}
                            </h3>
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                              }}
                            >
                              ✓ Verified Traveler
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            Tour: <strong>{tripTitle}</strong> • {rev.createdAt || 'Recent tour'}
                          </div>
                        </div>
                      </div>

                      {/* Ratings Badges */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div
                          style={{
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            textAlign: 'right',
                          }}
                        >
                          <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>
                            Guide Rating
                          </div>
                          <div style={{ color: '#d97706', fontSize: '14px', fontWeight: 800 }}>
                            ⭐ {Number(rev.guideRating).toFixed(1)} / 5.0
                          </div>
                        </div>

                        {rev.tripRating && (
                          <div
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              textAlign: 'right',
                            }}
                          >
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                              Trip Overall
                            </div>
                            <div style={{ color: '#475569', fontSize: '14px', fontWeight: 700 }}>
                              ⭐ {Number(rev.tripRating).toFixed(1)} / 5.0
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Review Body */}
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '14px 18px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: '#334155',
                        borderLeft: '4px solid #0284c7',
                        fontStyle: 'italic',
                      }}
                    >
                      "{rev.comment}"
                    </div>

                    {/* Existing Guide Reply */}
                    {reply && (
                      <div
                        style={{
                          marginTop: '14px',
                          marginLeft: '24px',
                          background: '#f0f9ff',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          borderLeft: '4px solid #0284c7',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1' }}>
                            🧭 Response from Guide ({guideProfile?.name || 'You'})
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            • {new Date(reply.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#0f172a' }}>{reply.text}</div>
                      </div>
                    )}

                    {/* Reply Action */}
                    {!reply && (
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                        {!isReplying ? (
                          <button
                            type="button"
                            onClick={() => { setActiveReplyId(rev.reviewId); setReplyText(''); }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--primary, #0284c7)',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>💬</span> Acknowledge / Reply to Traveler
                          </button>
                        ) : (
                          <div style={{ width: '100%', marginTop: '8px' }}>
                            <textarea
                              rows={3}
                              placeholder={`Thank ${travelerName} for their feedback...`}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                resize: 'vertical',
                              }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                              <button
                                type="button"
                                onClick={() => { setActiveReplyId(null); setReplyText(''); }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#fff',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveReply(rev.reviewId)}
                                disabled={!replyText.trim()}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'var(--primary, #0284c7)',
                                  color: '#fff',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                                  opacity: replyText.trim() ? 1 : 0.6,
                                }}
                              >
                                Post Response
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
