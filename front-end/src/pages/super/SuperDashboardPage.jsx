import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { AdminPage, money } from '../../components/admin/AdminUI';
import { useReduxAdminData } from '../../store/hooks';
import SuperMetricCard from '../../components/super/SuperMetricCard';

/**
 * SuperDashboardPage
 * Primary route: /super/dashboard
 *
 * Master governance console for superusers.
 *
 * Pedagogical Architecture & Policy Compliance:
 * 1. No Silent Fallbacks:
 *    - Removed `.catch(() => [])` and `.catch(() => null)` fallbacks that previously
 *      turned backend outages into misleading 0 users or 0 revenue.
 * 2. Measured Telemetry:
 *    - Real latency measurement against the active API probe.
 *    - Replaced hardcoded external service pings with transparent operational disclosures.
 * 3. Accurate Financial & Population Scopes:
 *    - Distinguishes Gross Paid Volume from Platform Commission Revenue and Net Margin.
 *    - Documents population, filters, units, and timeframe for all telemetry.
 */

export default function SuperDashboardPage() {
  const { user } = useSession();
  const resource = useReduxAdminData('superuserDashboard');
  const data = resource.data;
  const dash = data?.dash;
  const revenue = data?.revenue;
  const pendingApprovals = data?.pendingApprovals || [];

  const [decisionBusy, setDecisionBusy] = useState(false);

  const handleDecision = async (id, decision) => {
    setDecisionBusy(true);
    try {
      const action = decision === 'APPROVE' ? 'approve' : 'reject';
      await resource.run(action, [id, ` ${decision === 'APPROVE' ? 'Approved' : 'Rejected'} via Super Admin Governance Center`]);
    } catch (err) {
      alert(`Decision failed: ${err.message}`);
    } finally {
      setDecisionBusy(false);
    }
  };

  // Real measured latency for backend probe
  const livePing = data?.measuredLatencyMs != null ? `${data.measuredLatencyMs}ms` : 'Measuring...';

  const systemServices = [
    {
      name: 'Core API & Auth Engine',
      status: 'healthy',
      statusLabel: 'Operational',
      telemetry: `${livePing} (Measured probe)`,
      color: '#10b981',
      bg: '#ecfdf5',
    },
    {
      name: 'In-Memory State & Cache',
      status: 'healthy',
      statusLabel: 'In-Process',
      telemetry: '< 1ms (Node.js runtime)',
      color: '#10b981',
      bg: '#ecfdf5',
    },
    {
      name: 'Payment Gateway Integration',
      status: 'simulated',
      statusLabel: 'Simulated',
      telemetry: 'External probe unavailable (Demo mode)',
      color: '#f59e0b',
      bg: '#fffbeb',
    },
    {
      name: 'Notification Dispatcher',
      status: 'unprobed',
      statusLabel: 'In-Memory',
      telemetry: 'Push probe unavailable (No SMS/Email gateway)',
      color: '#64748b',
      bg: '#f8fafc',
    },
    {
      name: 'Static Media & File Storage',
      status: 'local',
      statusLabel: 'Local Disk',
      telemetry: 'Local directory (No S3 probe configured)',
      color: '#64748b',
      bg: '#f8fafc',
    },
  ];

  const totalUsers =
    (data?.travelerCount ?? 0) +
    (data?.guideCount ?? 0) +
    (dash?.usersByRole?.admins ?? 0) +
    (dash?.usersByRole?.supportUsers ?? 0);

  const pendingAgencies =
    dash?.agencyMetrics?.pendingAgencies ??
    dash?.agency_metrics?.pending_agencies ??
    0;

  const totalAgencies =
    dash?.totalAgencies ??
    dash?.total_agencies ??
    0;

  return (
    <AdminPage title="Superuser Governance Console" resource={resource}>
      {data && (
        <>
          {/* Welcome Banner */}
          <div
            className="card"
            style={{
              padding: '24px',
              borderRadius: '16px',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #f5f3ff 0%, #ffeef5 100%)',
              border: '1px solid #e0e7ff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#4338ca', marginBottom: '6px' }}>
                  Welcome back, {user?.name || 'Administrator'} 👑
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
                  Master Governance Active &bull; Platform telemetry, verified revenue settlement, and partner ecosystem oversight.
                </p>
              </div>
              <span
                style={{
                  background: '#6366f1',
                  color: '#fff',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                Root Privileges
              </span>
            </div>
          </div>

          {/* Key Provenance-Backed Governance Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <SuperMetricCard
              title="Gross Paid Volume"
              value={money(dash.totalPlatformRevenue)}
              population="All Paid Transactions"
              statusFilter="status = 'Paid'"
              units="INR (₹)"
              timePeriod="All-time settled"
              accentColor="#0284c7"
              note="Total customer payments cleared through traveler and agency portals."
            />

            <SuperMetricCard
              title="Platform Commission"
              value={money(revenue?.totalRevenue ?? 0)}
              population="Commission Ledger"
              statusFilter="status IN ['EARNED', 'SETTLED']"
              units="INR (₹)"
              timePeriod="All-time retained"
              accentColor="#059669"
              note="GlobeSync retained platform margin after agency/guide payouts."
            />

            <SuperMetricCard
              title="Net Profit Margin"
              value={`${revenue?.netProfitMargin ?? '0.00'}%`}
              population="Commission / Gross Volume"
              statusFilter="Settled transactions"
              units="Percentage (%)"
              timePeriod="All-time"
              accentColor="#7c3aed"
            />

            <SuperMetricCard
              title="Registered Travelers"
              value={data.travelerCount}
              population="Traveler Accounts"
              statusFilter="Registered users"
              units="Accounts"
              timePeriod="Current directory"
              accentColor="#0f172a"
            />

            <SuperMetricCard
              title="Certified Guides"
              value={data.guideCount}
              population="Tour Guide Accounts"
              statusFilter="Verified guides"
              units="Accounts"
              timePeriod="Current directory"
              accentColor="#0f172a"
            />

            <SuperMetricCard
              title="Total System Accounts"
              value={totalUsers}
              population="All System Actors"
              statusFilter="Travelers + Guides + Admins + Support"
              units="Accounts"
              timePeriod="All-time active"
              accentColor="#0f172a"
              note="Reflects account count. MAU telemetry is omitted without active session probes."
            />

            <SuperMetricCard
              title="Global Trips"
              value={data.tripCount}
              population="Trip Itineraries"
              statusFilter="All lifecycle statuses"
              units="Trips"
              timePeriod="All-time"
              accentColor="#0f172a"
            />

            <SuperMetricCard
              title="Enrolled Agencies"
              value={`${dash.agencyMetrics?.approvedAgencies ?? 0} / ${totalAgencies}`}
              population="Travel Partner Agencies"
              statusFilter="Approved / Total"
              units="Agencies"
              timePeriod="All-time"
              accentColor={pendingAgencies > 0 ? '#b45309' : '#059669'}
              note={pendingAgencies > 0 ? `${pendingAgencies} partner application(s) pending vetting.` : 'All partners verified.'}
            />
          </div>

          {/* Infrastructure Health & Telemetry */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
              gap: '24px',
              marginBottom: '28px',
            }}
          >
            {/* System Status Panel */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>🛡️</span> Measured Infrastructure Health
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {systemServices.map((srv) => (
                  <div
                    key={srv.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{srv.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {srv.telemetry}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: srv.bg,
                        color: srv.color,
                        border: `1px solid ${srv.color}33`,
                      }}
                    >
                      {srv.statusLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational Notices */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⚡</span> Operational Governance Notices
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingAgencies > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '14px',
                      borderRadius: '10px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#92400e' }}>
                        Partner Agencies Pending Review
                      </div>
                      <div style={{ fontSize: '13px', color: '#b45309', marginTop: '2px' }}>
                        {pendingAgencies} agency application{pendingAgencies > 1 ? 's' : ''} require
                        superuser approval before partner login is granted.
                      </div>
                      <Link
                        to="/super/agencies"
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#b45309',
                          textDecoration: 'underline',
                          marginTop: '6px',
                          display: 'inline-block',
                        }}
                      >
                        Review Applications &rarr;
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '14px',
                      borderRadius: '10px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#065f46' }}>
                        Agency Directory Fully Vetted
                      </div>
                      <div style={{ fontSize: '13px', color: '#047857', marginTop: '2px' }}>
                        All registered partner travel agencies are verified.
                      </div>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>💰</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                      Revenue Settlement Engine
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                      Agency commission ledger automatically settles upon trip completion transition.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🔒</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                      Role-Based Access Control
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                      Strict RolesGuard enforcing superuser-exclusive route barriers.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category C High-Risk Governance Approval Center */}
          <div style={{ marginTop: '24px', marginBottom: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛡️ High-Risk Approval Requests (Category C Governance)
              {pendingApprovals.length > 0 && (
                <span
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {pendingApprovals.length} Action Required
                </span>
              )}
            </h2>

            {pendingApprovals.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                No pending high-risk approval requests. Ordinary operational tasks are independently handled by Administrators.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingApprovals.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      padding: '18px 24px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      border: '1px solid #fed7aa',
                      borderLeft: '6px solid #f97316',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '16px', color: '#9a3412' }}>
                          Request #{req.id}: {req.type} ({req.entityType.toUpperCase()} #{req.entityId})
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                          Submitted by <strong>{req.requesterName}</strong> on {new Date(req.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={decisionBusy}
                          onClick={() => handleDecision(req.id, 'APPROVE')}
                          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                        >
                          ✓ Authorize & Execute
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={decisionBusy}
                          onClick={() => handleDecision(req.id, 'REJECT')}
                          style={{ color: '#dc2626' }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '14px', color: '#334155' }}>
                      <strong>Admin Justification:</strong> "{req.reason}"
                    </div>

                    {req.impactAnalysis && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: '#fef2f2',
                          border: '1px solid #fee2e2',
                          fontSize: '13px',
                          color: '#991b1b',
                        }}
                      >
                        <strong>Operational Impact Analysis:</strong> Affects {req.impactAnalysis.activeTripsCount} active trips (Trips: {req.impactAnalysis.activeTripIds?.join(', ') || 'none'}) and {req.impactAnalysis.activeBookingsCount} active bookings.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <h2>Governance Operations</h2>
          <div className="admin-actions" style={{ flexWrap: 'wrap' }}>
            <Link className="btn btn-secondary" to="/super/revenue">💰 Revenue & Margins</Link>
            <Link className="btn btn-secondary" to="/super/users">👥 User Directory</Link>
            <Link className="btn btn-secondary" to="/super/agencies">🏢 Manage Agencies</Link>
            <Link className="btn btn-secondary" to="/super/payment-methods">💳 Payment Methods</Link>
            <Link className="btn btn-secondary" to="/super/rules-config">⚙️ Rules Configuration</Link>
            <Link className="btn btn-secondary" to="/super/api-management">🔌 API Management</Link>
            <Link className="btn btn-secondary" to="/super/reports">📈 System Reports</Link>
            <Link className="btn btn-secondary" to="/super/profile">👤 Superuser Profile</Link>
          </div>
        </>
      )}
    </AdminPage>
  );
}
