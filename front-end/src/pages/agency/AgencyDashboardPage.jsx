import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { tripsApi, passengersApi, agencyApi, agenciesApi, packagesApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';

/**
 * AgencyDashboardPage
 * 
 * Central operational hub for travel agency partners.
 * Dynamically computes KPI cards from live backend trips, passenger roster, and commission ledger:
 * - Active Client Trips
 * - Total Passengers in Roster
 * - Gross B2B Revenue
 * - Earned Commissions
 * Includes Quick Actions and live recent client trips table.
 */
export default function AgencyDashboardPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [agencyProfile, setAgencyProfile] = useState(user || null);
  const [trips, setTrips] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [tripsData, passengersData, commissionsData, agencyData, packagesData] = await Promise.all([
        tripsApi.getByAgency(agencyId, { signal }).catch(() => []),
        passengersApi.getByAgency(agencyId, { signal }).catch(() => []),
        agencyApi.getCommissions({ signal }).catch(() => []),
        agenciesApi.getById(agencyId, { signal }).catch(() => null),
        packagesApi.getAll({ signal }).catch(() => []),
      ]);

      if (!signal?.aborted) {
        setTrips(Array.isArray(tripsData) ? tripsData : []);
        setPassengers(Array.isArray(passengersData) ? passengersData : []);
        setCommissions(Array.isArray(commissionsData) ? commissionsData : []);
        if (agencyData) setAgencyProfile(agencyData);
        if (Array.isArray(packagesData)) setPackages(packagesData.slice(0, 4));
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Agency dashboard data load error:', err);
        setError(err.message || 'Failed to load agency dashboard metrics.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (agencyId) {
      loadDashboardData(controller.signal);
    }
    return () => controller.abort();
  }, [agencyId]);

  const businessName = agencyProfile?.businessName || user?.businessName || 'Horizon Travel Partners';
  const commissionRate = agencyProfile?.commissionRate ?? user?.commissionRate ?? 10.0;

  // Dynamically computed KPIs
  const activeTripsCount = useMemo(() => {
    return trips.filter((t) => {
      const st = (t.status || '').toLowerCase();
      return st === 'active' || st === 'confirmed';
    }).length;
  }, [trips]);

  const totalPassengersCount = useMemo(() => {
    return passengers.length;
  }, [passengers]);

  const grossB2BRevenue = useMemo(() => {
    return trips
      .filter((t) => (t.status || '').toLowerCase() !== 'cancelled')
      .reduce((sum, t) => sum + Number(t.budget || 0), 0);
  }, [trips]);

  const earnedCommissions = useMemo(() => {
    return commissions
      .filter((c) => {
        const st = (c.status || '').toLowerCase();
        return st === 'earned' || st === 'settled';
      })
      .reduce((sum, c) => sum + Number(c.commissionAmount || 0), 0);
  }, [commissions]);

  // Sorted recent trips
  const recentTrips = useMemo(() => {
    return [...trips]
      .sort((a, b) => (b.tripId || 0) - (a.tripId || 0))
      .slice(0, 5);
  }, [trips]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Welcome Header */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfc 100%)',
          border: '1px solid #99f6e4',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 16px rgba(13,148,136,0.06)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {businessName} 🏢
            </h2>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                background: '#ecfdf5',
                color: '#059669',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid #a7f3d0',
              }}
            >
              Verified Partner
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px', marginBottom: 0 }}>
            Agency #{agencyId} · Contract Commission Rate: <strong style={{ color: '#0d9488' }}>{commissionRate}%</strong> per confirmed client booking
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/agency/create-trip')}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
              border: 'none',
              fontWeight: 700,
              padding: '10px 18px',
              borderRadius: '10px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(13,148,136,0.25)',
            }}
          >
            <span>+</span> Create Client Trip
          </button>
          <button
            type="button"
            onClick={() => navigate('/agency/packages')}
            className="btn btn-secondary"
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '10px',
              cursor: 'pointer',
              background: '#fff',
              border: '1px solid #cbd5e1',
              color: '#334155',
            }}
          >
            🏷️ Resell Package
          </button>
          <button
            type="button"
            onClick={() => navigate('/agency/passengers')}
            className="btn btn-secondary"
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '10px',
              cursor: 'pointer',
              background: '#fff',
              border: '1px solid #cbd5e1',
              color: '#334155',
            }}
          >
            👥 Add Passenger
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 4 Dynamic KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <SummaryCard
          title="Active Client Trips"
          value={loading ? '...' : String(activeTripsCount)}
          subtitle="Confirmed or ongoing journeys"
          icon="✈️"
          linkTo="/agency/trips"
        />
        <SummaryCard
          title="Total Passengers in Roster"
          value={loading ? '...' : String(totalPassengersCount)}
          subtitle="Saved client traveler profiles"
          icon="👥"
          linkTo="/agency/passengers"
        />
        <SummaryCard
          title="Gross B2B Revenue"
          value={loading ? '...' : `₹${grossB2BRevenue.toLocaleString('en-IN')}`}
          subtitle="Cumulative client bookings volume"
          icon="📈"
          linkTo="/agency/trips"
        />
        <SummaryCard
          title="Earned Commissions"
          value={loading ? '...' : `₹${earnedCommissions.toLocaleString('en-IN')}`}
          subtitle="Realized partner earnings"
          icon="💰"
          linkTo="/agency/commission"
        />
      </div>

      {/* Middle Grid: Catalog Highlights + Operating Model */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Popular Tour Packages Catalog */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Catalog Highlights for Resellers
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', margin: 0 }}>
                High-demand packages ready for instant client reselling with live commission
              </p>
            </div>
            <Link
              to="/agency/packages"
              style={{ fontSize: '13px', color: '#0d9488', fontWeight: 700, textDecoration: 'none' }}
            >
              Browse All ({packages.length}) →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {packages.map((pkg) => {
              const pkgId = pkg.packageId || pkg.id;
              const pkgTitle = pkg.name || pkg.title || 'Curated Holiday Tour';
              const pkgDest = pkg.destinations || pkg.destination || 'Global Tour';
              const price = Number(pkg.budget ?? pkg.price ?? 0);
              const estCommission = Math.round(price * (commissionRate / 100));
              const durationText = pkg.duration ? `${pkg.duration} Days` : 'Multi-day itinerary';

              return (
                <div
                  key={pkgId}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#0d9488', fontWeight: 700, textTransform: 'uppercase' }}>
                      📍 {pkgDest}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                      {pkgTitle}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      {durationText}
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                        Earn ₹{estCommission.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/agency/packages')}
                      className="btn btn-sm"
                      style={{
                        width: '100%',
                        background: '#0d9488',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '7px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      Resell to Client
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agency Partner Highlights & Quick Policies */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              Partner Commission Engine
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', margin: '0 0 16px 0' }}>
              Your B2B contract guarantees a <strong>{commissionRate}%</strong> partner margin on all client journeys and packages booked through GlobeSync.
            </p>

            <div style={{ background: '#f0fdfa', padding: '16px', borderRadius: '12px', border: '1px solid #99f6e4' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e', marginBottom: '8px' }}>
                💼 End-to-End Agency Workflow
              </div>
              <ul style={{ fontSize: '12px', color: '#134e4a', paddingLeft: '18px', margin: 0, lineHeight: '1.8' }}>
                <li>Build multi-step custom client itineraries with transport & guides</li>
                <li>Resell pre-curated catalog packages with instant commission booking</li>
                <li>Roster management with ID documentation & dietary tracking</li>
                <li>Real-time commission ledger with CSV export for accounting</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => navigate('/agency/commission')}
              style={{
                width: '100%',
                padding: '11px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#0d9488',
                cursor: 'pointer',
              }}
            >
              View Full Commission Statement →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Client Trips Table */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Recent Client Trips
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', margin: 0 }}>
              Journeys planned and managed under your agency account
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/agency/trips')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#0f172a',
            }}
          >
            View All Trips ({trips.length}) →
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
            Loading recent trips...
          </div>
        ) : recentTrips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>✈️</div>
            <p style={{ margin: '0 0 10px 0' }}>No client trips recorded yet.</p>
            <button
              type="button"
              onClick={() => navigate('/agency/create-trip')}
              style={{
                background: '#0d9488',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Create First Client Trip
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', background: '#f8fafc' }}>
                  <th style={{ padding: '12px 14px' }}>Trip ID</th>
                  <th style={{ padding: '12px 14px' }}>Destination / Title</th>
                  <th style={{ padding: '12px 14px' }}>Travel Dates</th>
                  <th style={{ padding: '12px 14px' }}>Passengers</th>
                  <th style={{ padding: '12px 14px' }}>Recorded Budget</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((t) => {
                  const passCount = Array.isArray(t.passengerIds) ? t.passengerIds.length : (t.travelersCount || 1);
                  return (
                    <tr key={t.tripId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px', fontWeight: 800, color: '#0d9488' }}>
                        #{t.tripId}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.title || t.destination}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>📍 {t.destination}</div>
                      </td>
                      <td style={{ padding: '14px', color: '#64748b', fontSize: '13px' }}>
                        {t.startDate} {t.endDate ? `→ ${t.endDate}` : ''}
                      </td>
                      <td style={{ padding: '14px', color: '#334155' }}>
                        👥 {passCount} {passCount === 1 ? 'client' : 'clients'}
                      </td>
                      <td style={{ padding: '14px', fontWeight: 700, color: '#0f172a' }}>
                        ₹{Number(t.budget || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <StatusBadge status={t.status || 'Planning'} />
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => navigate('/agency/trips')}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            background: '#fff',
                            color: '#0d9488',
                            cursor: 'pointer',
                          }}
                        >
                          Manage →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
