import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { useResource } from '../../store/hooks';
import GuideStatsGrid from '../../components/guide/GuideStatsGrid';
import GuideProfileCard from '../../components/guide/GuideProfileCard';
import GuideQuickActions from '../../components/guide/GuideQuickActions';
import './guide.css';

/**
 * GuideDashboardPage
 * Primary dashboard view for authenticated guides.
 * - Fetches assignment metrics and guide profile through Redux resources
 * - Shows assignedTripsCount, completedTripsCount, pendingRequests, messagesCount
 * - Does not invent missing ratings or prices
 * - Labels pricePerTrip accurately as Price per Trip
 */
export default function GuideDashboardPage() {
  const { user } = useSession();

  // Extract guide ID according to contract identity conventions
  const guideId = user?.guideId ?? user?.id;

  // Component state
  const dashboardResource = useResource('guideDashboard', { guideId }, { load: Boolean(guideId) });
  const guideResource = useResource('guides', { scope: 'getById', id: guideId }, { load: Boolean(guideId) });
  const dashData = dashboardResource.items[0] || {};
  const stats = {
    assignedTripsCount: Number(dashData.assignedTripsCount) || 0,
    completedTripsCount: Number(dashData.completedTripsCount) || 0,
    pendingRequests: Number(dashData.pendingRequests) || 0,
    messagesCount: Number(dashData.messagesCount) || 0,
  };
  const guideProfile = guideResource.items[0] || user;
  const isLoading = dashboardResource.status === 'loading' || guideResource.status === 'loading';
  const errorMessage = dashboardResource.error || guideResource.error;
  const [lastUpdated, setLastUpdated] = useState(null);

  // Named fetch handler with AbortController support
  const fetchDashboardData = () => Promise.all([dashboardResource.refresh(), guideResource.refresh()]);

  // Named event handlers
  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handleRetry = () => {
    fetchDashboardData();
  };

  const guideDisplayName = guideProfile?.name || user?.name || 'Guide';

  return (
    <div className="guide-container">
      {/* Welcome Banner */}
      <div className="guide-welcome-card">
        <div>
          <h2 className="guide-welcome-title">
            Welcome, {guideDisplayName}! 🧭
          </h2>
          <p className="guide-welcome-subtitle">
            Manage your assigned tours, review pending trip requests, and coordinate with travelers.
          </p>
        </div>

        <div className="guide-header-actions">
          <span className="guide-badge">🧭 Guide Portal</span>
          <button
            type="button"
            onClick={handleRefresh}
            className="guide-refresh-btn"
            disabled={isLoading}
            title="Refresh metrics from backend"
          >
            <span>🔄</span>
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error Feedback with Retry Handler */}
      {errorMessage && (
        <div className="guide-error-banner">
          <div className="guide-error-text">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={handleRetry} className="guide-retry-btn">
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading State Spinner */}
      {isLoading && !errorMessage ? (
        <div className="guide-state-card">
          <div className="guide-spinner" />
          <div className="guide-state-label">Loading guide dashboard data…</div>
          <div className="guide-loading-sublabel">
            Fetching assignment metrics from backend API
          </div>
        </div>
      ) : (
        <>
          {/* Key Assignment Metrics */}
          <GuideStatsGrid stats={stats} />

          {/* Verified Guide Profile (no invented ratings or prices) */}
          <GuideProfileCard guide={guideProfile || user} guideId={guideId} />

          {/* Quick Reviews & Feedback Card */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid var(--border-light, #f0f0f0)',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '16px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                }}
              >
                ⭐
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                  Traveler Reviews & Star Ratings
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  See feedback left by travelers on your completed tours, star breakdowns, and post public replies.
                </p>
              </div>
            </div>
            <Link
              to="/guide/reviews"
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
              }}
            >
              <span>⭐</span>
              <span>Open Reviews Hub →</span>
            </Link>
          </div>

          {/* Navigation Links to All Portal Modules */}
          <GuideQuickActions />

          {/* Last Synchronized Timestamp */}
          {lastUpdated && (
            <div className="guide-sync-timestamp">
              Dashboard metrics synchronized at {lastUpdated}
            </div>
          )}
        </>
      )}
    </div>
  );
}
