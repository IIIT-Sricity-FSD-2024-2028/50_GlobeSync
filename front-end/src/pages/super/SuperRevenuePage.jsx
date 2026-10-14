import React, { useState } from 'react';
import { revenueApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import SummaryCard from '../../components/common/SummaryCard';
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
      () =>
        revenueApi.updateConfig(editingConfig.key_name, { value: val }),
      `Configuration '${editingConfig.key_name}' updated to ${val}.`,
      () => setEditingConfig(null)
    );
  };

  return (
    <AdminPage title="Financial Intelligence & Revenue Governance" resource={resource}>
      {d && (
        <>
          {/* Top 5 KPI Cards matching super/revenue.html */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <SummaryCard
              label="Gross Booking Value"
              value={money(overview.grossBookingValue)}
              style={{ borderRadius: 12 }}
            />
            <SummaryCard
              label="Platform Revenue"
              value={
                <span style={{ color: '#059669', fontWeight: 800 }}>
                  {money(overview.totalRevenue)}
                </span>
              }
              style={{ borderRadius: 12 }}
            />
            <SummaryCard
              label="Total Payouts"
              value={money(overview.totalPayouts)}
              style={{ borderRadius: 12 }}
            />
            <SummaryCard
              label="Pending Settlement"
              value={
                <span style={{ color: '#d97706' }}>
                  {money(overview.pendingRevenue)}
                </span>
              }
              style={{ borderRadius: 12 }}
            />
            <SummaryCard
              label="Subscription MRR"
              value={
                <span style={{ color: '#7c3aed' }}>
                  {money(overview.breakdown?.SUBSCRIPTION ?? 0)}
                </span>
              }
              style={{ borderRadius: 12 }}
            />
          </div>

          {/* Revenue Category Breakdown Progress */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
              Revenue Contribution by Stream
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        {stream.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                        {money(amt)} ({pct}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
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
          <div className="card" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Monetization & Commission Engine Parameters ⚙️
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
                  Superuser-exclusive control over platform margins, agency baseline cuts, and cancellation policies.
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
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
