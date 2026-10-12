import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { dashboardApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';

/**
 * TravelerDashboardPage: Personal travel hub for authenticated travelers.
 *
 * Responsibilities:
 * - Fetches traveler metrics via GET /dashboard/traveler/:travelerId using dashboardApi.getTraveler
 * - Displays authoritative backend fields:
 *     1. myTripsCount (total trips created)
 *     2. myBookingsCount (total bookings reserved)
 *     3. myExpensesTotal (authoritative sum of On-Trip Expenses + Confirmed Bookings)
 *     4. mySupportTicketsCount (total support tickets submitted)
 *     5. upcomingTrips (trips with startDate >= today, excluding Completed and Cancelled)
 * - Renders summary cards with SummaryCard component receiving label and value props
 * - Explicitly explains the backend spending total to prevent frontend double-counting
 * - Keeps traveler profile metadata and provides direct navigation shortcuts
 * - Supports loading skeletons, graceful error states with retry, empty upcoming trip states,
 *   and manual refresh without full page reload.
 */
export default function TravelerDashboardPage() {
  const { user } = useSession();

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const travelerId = Number(user?.travelerId || user?.traveler_id || user?.id);

  // Load dashboard metrics from backend
  const loadDashboard = async (signal) => {
    if (!travelerId) {
      setLoading(false);
      setError('No authenticated traveler ID found. Please log in.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calls GET /dashboard/traveler/:travelerId
      const data = await dashboardApi.getTraveler(travelerId, { signal });
      if (!signal?.aborted) {
        setDashboardData(data);
      }
    } catch (err) {
      if (!err.isCancelled && !signal?.aborted) {
        console.error('[TravelerDashboardPage] Failed to load dashboard:', err);
        setError(err.message || 'Failed to load traveler dashboard records from backend.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);

    return () => {
      controller.abort();
    };
  }, [travelerId]);

  const handleRefresh = () => {
    loadDashboard();
  };

  return (
    <div className="traveler-dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Hero Welcome & Quick Action Header */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #fff 0%, #fff7f9 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 4px 15px rgba(232, 70, 124, 0.05)',
        }}
      >
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Welcome back, {user?.name || 'Traveler'}! 🎒
            </h2>
            <span
              style={{
                background: 'var(--primary)',
                color: '#fff',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.5px',
              }}
            >
              TL00{travelerId}
            </span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px', maxWidth: '640px', lineHeight: 1.5 }}>
            Your personal travel hub. Track scheduled journeys, inspect bookings, monitor on-trip expenses,
            and coordinate directly with certified local tour guides.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-secondary"
            style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 600 }}
            disabled={loading}
            title="Refresh dashboard metrics"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
          <Link
            to="/traveler/plan"
            className="btn btn-primary"
            style={{
              textDecoration: 'none',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            + Plan New Trip 🗺
          </Link>
          <Link
            to="/traveler/packages"
            className="btn btn-secondary"
            style={{
              textDecoration: 'none',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Browse Packages 📦
          </Link>
        </div>
      </div>

      {/* 2. Loading State */}
      {loading && (
        <div className="card" style={{ padding: '60px', textAlign: 'center', borderRadius: '16px', background: '#fff' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Loading your personal dashboard...</h3>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
            Fetching trips, bookings, expenses, and upcoming itineraries from backend.
          </p>
        </div>
      )}

      {/* 3. Error State */}
      {!loading && error && (
        <div
          style={{
            padding: '28px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '16px',
            textAlign: 'center',
            color: '#991b1b',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
          <h4 style={{ fontSize: '17px', fontWeight: 800 }}>Failed to load dashboard metrics</h4>
          <p style={{ fontSize: '14px', margin: '8px 0 16px' }}>{error}</p>
          <button type="button" onClick={() => loadDashboard()} className="btn btn-primary">
            Retry Connection ↺
          </button>
        </div>
      )}

      {/* 4. Populated Dashboard Content */}
      {!loading && !error && dashboardData && (
        <>
          {/* 4a. 4 Key Metrics (SummaryCard Components) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
            }}
          >
            <SummaryCard
              label="My Trips"
              value={dashboardData.myTripsCount}
              icon="🗺️"
              subtitle="All scheduled itineraries"
              linkTo="/traveler/trips"
              color="var(--primary)"
            />

            <SummaryCard
              label="My Bookings"
              value={dashboardData.myBookingsCount}
              icon="🎫"
              subtitle="Flights, stays, & transit"
              linkTo="/traveler/bookings"
              color="#0ea5e9"
            />

            <SummaryCard
              label="Total Spent"
              value={`₹${Number(dashboardData.myExpensesTotal || 0).toLocaleString('en-IN')}`}
              icon="💳"
              subtitle="Combined backend expenses"
              linkTo="/traveler/expenses"
              color="#059669"
            />

            <SummaryCard
              label="Support Tickets"
              value={dashboardData.mySupportTicketsCount}
              icon="🎧"
              subtitle="Assistance requests submitted"
              linkTo="/traveler/support"
              color="#8b5cf6"
            />
          </div>

          {/* 4b. Authoritative Spending Explanation Callout Banner */}
          <div
            style={{
              padding: '16px 20px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
            }}
          >
            <div style={{ fontSize: '20px', lineHeight: 1 }}>💡</div>
            <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>About Your Spending Total (₹{Number(dashboardData.myExpensesTotal || 0).toLocaleString('en-IN')}):</strong>{' '}
              This figure is calculated authoritative by the backend as the exact sum of{' '}
              <strong>all on-trip manual expenses</strong> (itinerary meals, activities, local transit) plus{' '}
              <strong>all Confirmed booking payments</strong> (flights, hotels, buses). Pending and cancelled bookings are excluded.
              To prevent double-counting, the frontend displays this backend figure directly without adding booking amounts a second time.
            </div>
            <Link
              to="/traveler/expenses"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--primary)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                alignSelf: 'center',
              }}
            >
              Expense Ledger →
            </Link>
          </div>

          {/* 4c. Upcoming Trips Section */}
          <div
            className="card"
            style={{
              padding: '24px',
              borderRadius: '16px',
              background: '#fff',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid var(--border-light, #eee)',
                paddingBottom: '12px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  🗓️ Upcoming Journeys ({dashboardData.upcomingTrips?.length || 0})
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px', margin: 0 }}>
                  Active scheduled itineraries with departure dates from today onwards.
                </p>
              </div>

              <Link
                to="/traveler/trips"
                style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}
              >
                View All Trips ({dashboardData.myTripsCount}) →
              </Link>
            </div>

            {/* Empty Upcoming Trips State */}
            {(!dashboardData.upcomingTrips || dashboardData.upcomingTrips.length === 0) ? (
              <div
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: 'var(--bg-soft, #f8fafc)',
                  borderRadius: '12px',
                  border: '1px dashed var(--border)',
                }}
              >
                <div style={{ fontSize: '42px', marginBottom: '10px' }}>✈️</div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  No upcoming journeys scheduled
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '420px', margin: '6px auto 18px' }}>
                  You do not have any confirmed or planned itineraries starting in the future.
                  Ready to explore a new destination?
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link
                    to="/traveler/plan"
                    className="btn btn-primary"
                    style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '13px', fontWeight: 700 }}
                  >
                    + Plan a Custom Trip
                  </Link>
                  <Link
                    to="/traveler/packages"
                    className="btn btn-secondary"
                    style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '13px', fontWeight: 600 }}
                  >
                    Explore Tour Packages 📦
                  </Link>
                </div>
              </div>
            ) : (
              /* Populated Upcoming Trips List */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {dashboardData.upcomingTrips.map((trip) => (
                  <div
                    key={trip.tripId}
                    style={{
                      padding: '20px',
                      borderRadius: '14px',
                      border: '1px solid var(--border-light, #eee)',
                      background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: 'var(--primary)',
                            background: '#fff0f5',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          TRIP #{trip.tripId}
                        </span>
                        <StatusBadge status={trip.status || 'Confirmed'} />
                      </div>

                      <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        📍 {trip.destination}
                      </h4>

                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>📅 {trip.startDate} &rarr; {trip.endDate}</div>
                        <div>💰 Budget: <strong>₹{Number(trip.budget || 0).toLocaleString('en-IN')}</strong></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                      <Link
                        to={`/traveler/trips?tripId=${trip.tripId}`}
                        className="btn btn-primary"
                        style={{
                          textDecoration: 'none',
                          padding: '7px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          flex: 1,
                          textAlign: 'center',
                        }}
                      >
                        Manage Itinerary &rarr;
                      </Link>
                      <Link
                        to="/traveler/bookings"
                        className="btn btn-secondary"
                        style={{
                          textDecoration: 'none',
                          padding: '7px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        Bookings
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4d. Traveler Profile Summary & Quick Access Links */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Profile Snapshot Card */}
            <div
              className="card"
              style={{
                padding: '22px',
                borderRadius: '16px',
                background: '#fff',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  👤 Traveler Profile Details
                </h4>
                <Link
                  to="/traveler/profile"
                  style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}
                >
                  Edit Profile &rarr;
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ color: 'var(--muted)' }}>Account Name</span>
                  <strong>{user?.name || 'Traveler'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ color: 'var(--muted)' }}>Email Address</span>
                  <span>{user?.email || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ color: 'var(--muted)' }}>Contact Phone</span>
                  <span>{user?.phone || 'Not provided'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: 'var(--muted)' }}>Account ID</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>TL00{travelerId}</span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Hub Card */}
            <div
              className="card"
              style={{
                padding: '22px',
                borderRadius: '16px',
                background: '#fff',
                border: '1px solid var(--border)',
              }}
            >
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>
                ⚡ Quick Traveler Actions
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <Link
                  to="/traveler/plan"
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#fdf2f8',
                    border: '1px solid #fce7f3',
                    textDecoration: 'none',
                    color: '#831843',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <span>🗺️</span> Plan Trip
                </Link>

                <Link
                  to="/traveler/bookings"
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#f0f9ff',
                    border: '1px solid #e0f2fe',
                    textDecoration: 'none',
                    color: '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <span>🎫</span> My Bookings
                </Link>

                <Link
                  to="/traveler/expenses"
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#ecfdf5',
                    border: '1px solid #d1fae5',
                    textDecoration: 'none',
                    color: '#065f46',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <span>💳</span> Log Expenses
                </Link>

                <Link
                  to="/traveler/messages"
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#f5f3ff',
                    border: '1px solid #ede9fe',
                    textDecoration: 'none',
                    color: '#5b21b6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <span>💬</span> Guide Chat
                </Link>

                <Link
                  to="/traveler/support"
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    textDecoration: 'none',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <span>🎧</span> Help Tickets
                </Link>

                <Link
                  to="/traveler/profile"
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    textDecoration: 'none',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <span>👥</span> Co-Travelers
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
