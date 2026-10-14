import React, { useState } from 'react';
import { revenueApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  AdminDialog,
  Field,
  FormActions,
  money,
  matches,
  useAdminData,
} from '../../components/admin/AdminUI';
import SuperMetricCard from '../../components/super/SuperMetricCard';

/**
 * SuperRevenuePage
 * Primary route: /super/revenue
 *
 * Financial Intelligence & Revenue Governance console.
 *
 * Pedagogical Architecture & Policy Compliance:
 * 1. Financial Scope Distinction:
 *    - Clearly distinguishes Gross Booking Value (GBV), Platform Commission Revenue,
 *      Partner Payouts, and Net Margin.
 * 2. Subscription Provenance:
 *    - Labeled accurately as "Cumulative Subscription Revenue" instead of misrepresenting
 *      an all-time total as Monthly Recurring Revenue (MRR).
 * 3. Backend Monthly Trend:
 *    - Renders the exact 6-month monthly trend from the backend; empty months stay zero.
 * 4. Provenance Metadata:
 *    - Documents population, filters, units, and timeframe for all metrics.
 */

const loadRevenue = async (options) => {
  const [overview, breakdown, transactions, config] = await Promise.all([
    revenueApi.getOverview(options),
    revenueApi.getBreakdown(options),
    revenueApi.getTransactions(options),
    revenueApi.getConfig(options),
  ]);

  return {
    overview,
    breakdown: breakdown || {},
    transactions: Array.isArray(transactions) ? transactions : [],
    config: Array.isArray(config) ? config : [],
  };
};

const STREAM_TYPES = [
  'ALL',
  'BOOKING_COMMISSION',
  'AGENCY_COMMISSION',
  'GUIDE_COMMISSION',
  'PROVIDER_COMMISSION',
  'PACKAGE_MARKUP',
  'SUBSCRIPTION',
  'FEATURED_LISTING',
];

const TX_STATUSES = ['ALL', 'EARNED', 'SETTLED', 'PENDING', 'REFUNDED'];

/**
 * Presentational component rendering the authentic backend monthly trend.
 * Preserves zero values for months without transactions without interpolation.
 */
function MonthlyTrendSection({ monthlyTrend = [] }) {
  if (!Array.isArray(monthlyTrend) || monthlyTrend.length === 0) {
    return null;
  }

  const maxRevenue = Math.max(...monthlyTrend.map((m) => m.revenue || 0), 1);

  return (
    <div className="card" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
          6-Month Revenue Settlement Trend
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
          Derived from the backend monthly ledger. Empty months remain ₹0 without interpolation.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${monthlyTrend.length}, 1fr)`,
          gap: '12px',
          alignItems: 'end',
          height: '180px',
          padding: '16px 8px 8px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #f1f5f9',
        }}
      >
        {monthlyTrend.map((item, idx) => {
          const heightPct = Math.round(((item.revenue || 0) / maxRevenue) * 100);
          const isZero = (item.revenue || 0) === 0;

          return (
            <div
              key={`${item.month}-${item.year}-${idx}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isZero ? '#94a3b8' : '#059669',
                  marginBottom: '6px',
                  textAlign: 'center',
                }}
              >
                {money(item.revenue)}
              </div>
              <div
                style={{
                  width: '100%',
                  maxWidth: '48px',
                  height: `${Math.max(heightPct, 4)}%`,
                  background: isZero
                    ? '#e2e8f0'
                    : 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.3s ease',
                }}
              />
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  marginTop: '8px',
                }}
              >
                {item.month}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>{item.year}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SuperRevenuePage() {
  const resource = useAdminData(loadRevenue);
  const [query, setQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingConfig, setEditingConfig] = useState(null);
  const [configValue, setConfigValue] = useState('');

  const d = resource.data;
  const overview = d?.overview || {};

  const transactions = d?.transactions || [];
  const filteredTxs = transactions.filter((t) => {
    const matchType = streamFilter === 'ALL' || t.revenue_type === streamFilter;
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchQuery = matches(
      [
        t.transaction_id,
        t.revenue_type,
        t.booking_reference,
        t.agency_id,
        t.guide_id,
        t.status,
      ],
      query
    );
    return matchType && matchStatus && matchQuery;
  });

  const openConfigEdit = (cfg) => {
    setEditingConfig(cfg);
    setConfigValue(String(cfg.value_number ?? ''));
  };

  const saveConfig = (e) => {
    e.preventDefault();
    const val = Number(configValue);
    resource.run(
      () => revenueApi.updateConfig(editingConfig.key_name, { value: val }),
      `Configuration '${editingConfig.key_name}' updated to ${val}.`,
      () => setEditingConfig(null)
    );
  };

  return (
    <AdminPage title="Financial Intelligence & Revenue Governance" resource={resource}>
      {d && (
        <>
          {/* Provenance-Backed KPI Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <SuperMetricCard
              title="Gross Booking Value"
              value={money(overview.grossBookingValue)}
              population="All Transaction Face Values"
              statusFilter="status IN ['EARNED', 'SETTLED']"
              units="INR (₹)"
              timePeriod="All-time cumulative"
              accentColor="#0284c7"
              note="Total volume of travel bookings facilitated across all channels."
            />

            <SuperMetricCard
              title="Platform Commission"
              value={money(overview.totalRevenue)}
              population="Revenue Commission Ledger"
              statusFilter="status IN ['EARNED', 'SETTLED']"
              units="INR (₹)"
              timePeriod="All-time retained"
              accentColor="#059669"
              note="Actual platform fee and markup retained by GlobeSync."
            />

            <SuperMetricCard
              title="Partner Payouts"
              value={money(overview.totalPayouts)}
              population="Agency & Guide Allocations"
              statusFilter="status IN ['EARNED', 'SETTLED']"
              units="INR (₹)"
              timePeriod="All-time allocated"
              accentColor="#7c3aed"
              note="Portion disbursed to third-party agency and guide operators."
            />

            <SuperMetricCard
              title="Pending Settlement"
              value={money(overview.pendingRevenue)}
              population="Active & Planned Tours"
              statusFilter="status = 'PENDING' / 'EARNED'"
              units="INR (₹)"
              timePeriod="In-flight tours"
              accentColor="#d97706"
              note="Escrow revenue held until tour reaches Completed lifecycle."
            />

            <SuperMetricCard
              title="Net Profit Margin"
              value={`${overview.netProfitMargin ?? '0.00'}%`}
              population="Platform Revenue / Gross Volume"
              statusFilter="Settled transactions"
              units="Percentage (%)"
              timePeriod="All-time"
              accentColor="#059669"
            />

            <SuperMetricCard
              title="Cumulative Subscriptions"
              value={money(overview.breakdown?.SUBSCRIPTION ?? 0)}
              population="Agency Subscription Fees"
              statusFilter="revenue_type = 'SUBSCRIPTION'"
              units="INR (₹)"
              timePeriod="All-time cumulative"
              accentColor="#7c3aed"
              note="All-time agency subscriptions. MRR omitted without recurring billing telemetry."
            />
          </div>

          {/* Authentic Backend Monthly Trend */}
          <MonthlyTrendSection monthlyTrend={overview.monthlyTrend} />

          {/* Revenue Category Breakdown Progress */}
          <div
            className="card"
            style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
              Revenue Contribution by Stream
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {Object.entries(d.breakdown).map(([stream, amt]) => {
                const total = overview.totalRevenue || 1;
                const pct = Math.min(100, Math.round(((amt || 0) / total) * 100));
                return (
                  <div
                    key={stream}
                    style={{
                      background: '#f8fafc',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        {stream.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                        {money(amt)} ({pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        background: '#e2e8f0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #6366f1, #10b981)',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monetization Configuration Editor */}
          <div
            className="card"
            style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Monetization & Commission Engine Parameters ⚙️
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
                  Superuser-exclusive control over platform margins, agency baseline cuts, and
                  cancellation policies.
                </p>
              </div>
            </div>

            <AdminTable
              rowKey="key_name"
              rows={d.config}
              columns={[
                { label: 'Config Key', key: 'key_name' },
                {
                  label: 'Configured Value',
                  render: (c) => (
                    <span
                      style={{
                        fontWeight: 700,
                        padding: '4px 8px',
                        background: '#f1f5f9',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {c.value_number}
                    </span>
                  ),
                },
                { label: 'Parameter Description', key: 'description' },
                {
                  label: 'Actions',
                  render: (c) => (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openConfigEdit(c)}
                    >
                      Edit Value
                    </button>
                  ),
                },
              ]}
            />
          </div>

          {/* Transactions Ledger */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                Audit Transactions Ledger
              </h2>
            </div>

            <div className="admin-filters">
              <label>
                Search
                <input
                  aria-label="Search transactions"
                  type="search"
                  placeholder="Tx ID, booking, agency..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>

              <label>
                Stream Type
                <select
                  aria-label="Filter stream type"
                  value={streamFilter}
                  onChange={(e) => setStreamFilter(e.target.value)}
                >
                  {STREAM_TYPES.map((st) => (
                    <option key={st} value={st}>
                      {st === 'ALL' ? 'All Revenue Streams' : st.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  aria-label="Filter transaction status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {TX_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st === 'ALL' ? 'All Statuses' : st}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <AdminTable
              rowKey="transaction_id"
              rows={filteredTxs}
              columns={[
                { label: 'Tx ID', key: 'transaction_id' },
                {
                  label: 'Date',
                  render: (t) =>
                    t.created_at
                      ? new Date(t.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-',
                },
                {
                  label: 'Revenue Stream',
                  render: (t) => (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: '#e0e7ff',
                        color: '#3730a3',
                      }}
                    >
                      {t.revenue_type?.replace(/_/g, ' ')}
                    </span>
                  ),
                },
                {
                  label: 'Reference / Entity',
                  render: (t) =>
                    t.booking_reference
                      ? `Booking #${t.booking_reference}`
                      : t.agency_id
                      ? `Agency #${t.agency_id}`
                      : t.guide_id
                      ? `Guide #${t.guide_id}`
                      : 'Platform Direct',
                },
                {
                  label: 'Gross Volume',
                  render: (t) => money(t.gross_amount, t.currency || 'INR'),
                },
                {
                  label: 'Commission %',
                  render: (t) =>
                    t.commission_rate != null ? `${t.commission_rate}%` : '-',
                },
                {
                  label: 'Platform Net',
                  render: (t) => (
                    <span style={{ color: '#059669', fontWeight: 700 }}>
                      {money(t.revenue_amount, t.currency || 'INR')}
                    </span>
                  ),
                },
                {
                  label: 'Status',
                  render: (t) => <StatusBadge status={t.status} />,
                },
              ]}
            />
          </div>
        </>
      )}

      {/* Edit Config Modal */}
      {editingConfig && (
        <AdminDialog
          title={`Edit Monetization Config: ${editingConfig.key_name}`}
          onClose={() => setEditingConfig(null)}
          busy={resource.busy}
        >
          <form onSubmit={saveConfig}>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
              {editingConfig.description}
            </p>
            <Field
              label="Config Value (Number / Percentage / Multiplier)"
              type="number"
              step="any"
              value={configValue}
              onChange={(e) => setConfigValue(e.target.value)}
              required
              disabled={resource.busy}
            />
            {resource.error && (
              <p className="admin-error" role="alert">
                {resource.error}
              </p>
            )}
            <FormActions busy={resource.busy} onCancel={() => setEditingConfig(null)} />
          </form>
        </AdminDialog>
      )}
    </AdminPage>
  );
}
