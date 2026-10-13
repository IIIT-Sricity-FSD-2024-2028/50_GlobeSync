import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { dashboardApi, guidesApi } from '../../services/api';
import GuideStatsGrid from '../../components/guide/GuideStatsGrid';
import GuideProfileCard from '../../components/guide/GuideProfileCard';
import GuideQuickActions from '../../components/guide/GuideQuickActions';
import './guide.css';

/**
 * GuideDashboardPage
 * Primary dashboard view for authenticated guides.
 * - Fetches real assignment metrics using dashboardApi.getGuide(guideId)
 * - Fetches real guide profile using guidesApi.getById(guideId)
 * - Shows assignedTripsCount, completedTripsCount, pendingRequests, messagesCount
 * - Does not invent missing ratings or prices
 * - Labels pricePerTrip accurately as Price per Trip
 */
export default function GuideDashboardPage() {
  const { user } = useSession();

  // Extract guide ID according to contract identity conventions
  const guideId = user?.guideId ?? user?.id;

  // Component state
  const [stats, setStats] = useState({
    assignedTripsCount: 0,
    completedTripsCount: 0,
    pendingRequests: 0,
    messagesCount: 0,
  });
  const [guideProfile, setGuideProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Named fetch handler with AbortController support
  const fetchDashboardData = async (signal) => {
    if (!guideId) {
      setIsLoading(false);
      setErrorMessage('No active guide identifier found in current session.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch dashboard metrics and guide details concurrently
      const [dashData, profileData] = await Promise.all([
        dashboardApi.getGuide(guideId, { signal }),
        guidesApi.getById(guideId, { signal }).catch((err) => {
          // If guide profile endpoint fails or is unauthorized, log and fallback to user session
          console.warn('[GuideDashboard] Could not fetch guide profile from API, using session data:', err);
          return null;
        }),
      ]);

      if (dashData) {
        setStats({
          assignedTripsCount: Number(dashData.assignedTripsCount) || 0,
          completedTripsCount: Number(dashData.completedTripsCount) || 0,
          pendingRequests: Number(dashData.pendingRequests) || 0,
          messagesCount: Number(dashData.messagesCount) || 0,
        });
      }

      if (profileData) {
        setGuideProfile(profileData);
      } else {
        // Fallback to active user session data
        setGuideProfile(user);
      }

      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      if (err.isCancelled) return;
      console.error('[GuideDashboard] Failed to fetch dashboard data:', err);
      setErrorMessage(err.message || 'Failed to load dashboard metrics. Please check network or backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Purposeful useEffect to load data on mount or when guideId changes
  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [guideId]);

  // Named event handlers
  const handleRefresh = () => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);
  };

  const handleRetry = () => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);
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
