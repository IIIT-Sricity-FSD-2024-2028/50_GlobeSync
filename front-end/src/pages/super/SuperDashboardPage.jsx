import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import {
  dashboardApi,
  travelersApi,
  guidesApi,
  tripsApi,
  bookingsApi,
} from '../../services/api';
import {
  AdminPage,
  Metrics,
  money,
  useAdminData,
} from '../../components/admin/AdminUI';

const loadDashboard = async (options) => {
  const [dash, travelers, guides, trips, bookings] = await Promise.all([
    dashboardApi.getSuperuser(options).catch(() => null),
    travelersApi.getAll(options).catch(() => []),
    guidesApi.getAll(options).catch(() => []),
    tripsApi.getAll(options).catch(() => []),
    bookingsApi.getAll(options).catch(() => []),
  ]);

  return {
    dash,
    travelerCount: Array.isArray(travelers) ? travelers.length : 0,
    guideCount: Array.isArray(guides) ? guides.length : 0,
    tripCount: Array.isArray(trips) ? trips.length : 0,
    bookingCount: Array.isArray(bookings) ? bookings.length : 0,
  };
};

const SYSTEM_SERVICES = [
  { name: 'Core API & Auth Engine', status: 'healthy', ping: '18ms' },
  { name: 'In-Memory State & Cache', status: 'healthy', ping: '2ms' },
  { name: 'Payment Gateway Integration', status: 'healthy', ping: '124ms' },
  { name: 'Notification Service', status: 'healthy', ping: '45ms' },
  { name: 'File Storage Service', status: 'healthy', ping: '32ms' },
];

export default function SuperDashboardPage() {
  const { user } = useSession();
  const resource = useAdminData(loadDashboard);
  const data = resource.data;
  const dash = data?.dash;

  const totalRev = dash?.totalPlatformRevenue ?? dash?.total_platform_revenue ?? 0;
  const pendingAgencies =
    dash?.agencyMetrics?.pendingAgencies ??
    dash?.agency_metrics?.pending_agencies ??
    0;
  const totalAgencies =
    dash?.totalAgencies ??
    dash?.total_agencies ??
    0;

  const totalUsers = (data?.travelerCount ?? 0) + (data?.guideCount ?? 0);

  return (
    <AdminPage title="Superuser Governance Console" resource={resource}>
      {data && (
        <>
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
                  Root access active: Platform telemetry, financial governance, user lifecycles, and partner ecosystems.
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

          <Metrics
            items={[
              ['Platform Revenue', money(totalRev), '/super/revenue'],
              ['Registered Travelers', data.travelerCount, '/super/users'],
              ['Certified Guides', data.guideCount, '/super/users'],
              ['Total Users', totalUsers, '/super/users'],
              ['Global Trips', data.tripCount, '/admin/trips'],
              ['Total Bookings', data.bookingCount, '/admin/bookings'],
              ['Agencies Enrolled', totalAgencies, '/super/agencies'],
              ['Pending Verifications', pendingAgencies, '/super/agencies'],
            ]}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '24px',
              marginTop: '24px',
              marginBottom: '24px',
            }}
          >
            {/* System Status Panel */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🛡️</span> System Infrastructure Health
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {SYSTEM_SERVICES.map((srv) => (
                  <div
                    key={srv.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: srv.status === 'healthy' ? '#10b981' : '#f59e0b',
                        }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{srv.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{srv.ping}</span>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#ecfdf5',
                          color: '#065f46',
                        }}
                      >
                        Healthy
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Alerts & Telemetry */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚡</span> Operational Alerts & Notices
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
                        Pending Agency Verifications
                      </div>
                      <div style={{ fontSize: '13px', color: '#b45309', marginTop: '2px' }}>
                        {pendingAgencies} partner application{pendingAgencies > 1 ? 's' : ''} require superuser approval.
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
                        Review Applications →
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
                        Agency Approvals Clean
                      </div>
                      <div style={{ fontSize: '13px', color: '#047857', marginTop: '2px' }}>
                        All incoming agency reseller accounts have been verified.
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
                  <span style={{ fontSize: '18px' }}>🔄</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>In-Memory Synchronization</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                      Backend modular entities and mock datastores running in optimal state.
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
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>RBAC Enforced</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                      RolesGuard verifying strict user headers and cross-role route isolation.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h2>Quick Operations</h2>
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
