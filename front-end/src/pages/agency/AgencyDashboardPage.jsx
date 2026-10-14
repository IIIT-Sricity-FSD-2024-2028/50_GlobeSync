import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { dashboardApi, packagesApi, agenciesApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';

/**
 * AgencyDashboardPage
 * 
 * Central operational hub for travel agency partners.
 * Integrates live metrics from GET /dashboard/agency/:agencyId,
 * mini package catalog for rapid client booking, and recent transaction feeds.
 */
export default function AgencyDashboardPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    totalPassengers: 0,
    pendingCommission: 0,
    settledCommission: 0,
    recentBookings: [],
    ledger: [],
  });
  const [agencyProfile, setAgencyProfile] = useState(user || null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashRes, pkgsRes, agencyRes] = await Promise.allSettled([
          dashboardApi.getAgency(agencyId),
          packagesApi.getAll(),
          agenciesApi.getById(agencyId),
        ]);

        if (!isMounted) return;

        if (dashRes.status === 'fulfilled' && dashRes.value) {
          setMetrics(dashRes.value);
        }
        if (pkgsRes.status === 'fulfilled' && Array.isArray(pkgsRes.value)) {
          setPackages(pkgsRes.value.slice(0, 4));
        }
        if (agencyRes.status === 'fulfilled' && agencyRes.value) {
          setAgencyProfile(agencyRes.value);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Agency dashboard load error:', err);
          setError(err.message || 'Failed to load agency dashboard metrics.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (agencyId) {
      loadDashboard();
    }
    return () => {
      isMounted = false;
    };
  }, [agencyId]);

  const formatCurrency = (val) => {
    const num = Number(val);
    return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const businessName = agencyProfile?.businessName || user?.businessName || 'Agency Partner';
  const commissionRate = agencyProfile?.commissionRate ?? user?.commissionRate ?? 1.5;

  return (
    <div>
      {/* Top Welcome Header */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfc 100%)',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {businessName} 🏢
            </h2>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '12px',
                background: '#ecfdf5',
                color: '#059669',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid #a7f3d0',
              }}
            >
              Approved Partner
            </span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
            Agency #{agencyId} · Reseller Commission Tier: <strong>{commissionRate}%</strong> per booked passenger
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/agency/book-package')}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #19b6a6 0%, #0ea5e9 100%)',
              border: 'none',
              fontWeight: 700,
              padding: '10px 18px',
            }}
          >
            + Book for Client
          </button>
          <button
            type="button"
            onClick={() => navigate('/agency/passengers')}
            className="btn btn-secondary"
            style={{ padding: '10px 16px', fontSize: '13px' }}
          >
            👥 Manage Passengers
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard
          label="Client Bookings"
          value={loading ? '...' : metrics.totalBookings}
          icon="🎫"
          subtitle="Total trips & packages booked"
          linkTo="/agency/bookings"
          color="#19b6a6"
        />
        <SummaryCard
          label="Registered Passengers"
          value={loading ? '...' : metrics.totalPassengers}
          icon="👥"
          subtitle="In your offline passenger roster"
          linkTo="/agency/passengers"
          color="#3b82f6"
        />
        <SummaryCard
          label="Pending Commission"
          value={loading ? '...' : formatCurrency(metrics.pendingCommission)}
          icon="⏳"
          subtitle="Awaiting monthly settlement"
          badge="In Escrow"
          linkTo="/agency/commission"
          color="#f59e0b"
        />
        <SummaryCard
          label="Settled Commission"
          value={loading ? '...' : formatCurrency(metrics.settledCommission)}
          icon="💰"
          subtitle="Total realized earnings"
          badge="Paid"
          linkTo="/agency/commission"
          color="#10b981"
        />
      </div>

      {/* Middle Grid: Mini Packages + Commission Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Popular Tour Packages Catalog */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Catalog Highlights for Resellers
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                Instant booking packages available for your clients
              </p>
            </div>
            <Link
              to="/agency/packages"
              style={{ fontSize: '13px', color: '#19b6a6', fontWeight: 700, textDecoration: 'none' }}
            >
              Browse All ({packages.length}) →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {packages.map((pkg) => {
              const pkgId = pkg.packageId || pkg.id;
              const estCommission = ((Number(pkg.price) || 0) * (commissionRate / 100));

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
                    <div style={{ fontSize: '11px', color: '#19b6a6', fontWeight: 700, textTransform: 'uppercase' }}>
                      📍 {pkg.destination || 'Global Tour'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {pkg.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                      {pkg.duration ? `${pkg.duration} Days` : 'Multi-day tour'}
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ${pkg.price}
                      </span>
                      <span style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                        Earn +${estCommission.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/agency/book-package?packageId=${pkgId}`)}
                      className="btn btn-sm"
                      style={{
                        width: '100%',
                        background: '#19b6a6',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '6px 10px',
                      }}
                    >
                      Book for Client
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agency Partner Highlights & Quick Policies */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Partner Commission Summary
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
              Your reseller contract guarantees a <strong>{commissionRate}%</strong> margin on all confirmed passenger bookings. Commissions move from <em>pending</em> to <em>settled</em> upon tour completion.
            </p>

            <div style={{ marginTop: '16px', background: '#f0fdfc', padding: '14px', borderRadius: '12px', border: '1px solid #99f6e4' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e', marginBottom: '6px' }}>
                💼 Reseller Operating Model
              </div>
              <ul style={{ fontSize: '12px', color: '#134e4a', paddingLeft: '16px', margin: 0, lineHeight: '1.7' }}>
                <li>Add offline passengers to your agency roster</li>
                <li>Instant booking confirmation at catalog prices</li>
                <li>Real-time commission ledger tracking</li>
                <li>Simulated corporate billing in sandbox mode</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => navigate('/agency/commission')}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', padding: '10px', fontSize: '13px' }}
            >
              View Full Commission Statement →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Bookings Feed */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Recent Client Bookings
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Transactions processed under your agency account
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/agency/bookings')}
            className="btn btn-secondary btn-sm"
          >
            View All Bookings →
          </button>
        </div>

        {(!metrics.recentBookings || metrics.recentBookings.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎫</div>
            <p>No client bookings recorded yet.</p>
            <button
              type="button"
              onClick={() => navigate('/agency/book-package')}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '10px', background: '#19b6a6', border: 'none' }}
            >
              Book First Tour Package
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Booking / Trip</th>
                  <th style={{ padding: '10px 12px' }}>Destination / Service</th>
                  <th style={{ padding: '10px 12px' }}>Dates</th>
                  <th style={{ padding: '10px 12px' }}>Recorded Amount</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentBookings.map((b) => (
                  <tr key={b.tripId || b.bookingId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: 800, color: '#19b6a6' }}>
                      #{b.tripId || b.bookingId}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>
                      {b.destination || b.service || 'Tour Package'}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--muted)', fontSize: '13px' }}>
                      {b.startDate ? `${b.startDate} to ${b.endDate || ''}` : (b.bookingDate || 'N/A')}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>
                      ${b.budget || b.amount || 0}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <StatusBadge status={b.status || 'Confirmed'} />
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => navigate('/agency/bookings')}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
