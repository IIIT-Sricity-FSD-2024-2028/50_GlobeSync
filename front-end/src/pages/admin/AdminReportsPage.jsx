import React, { useState, useMemo } from 'react';
import {
  dashboardApi,
  tripsApi,
  bookingsApi,
  reviewsApi,
  revenueApi,
} from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  Filters,
  Metrics,
  money,
  matches,
  useAdminData,
} from '../../components/admin/AdminUI';

/**
 * Composite data loader for administrative reporting.
 *
 * Pedagogical Architecture:
 * - Employs Promise.allSettled to ensure that transient failures in secondary
 *   endpoints (e.g. revenue breakdown or review aggregations) do not hide the entire report.
 * - Explicitly tracks and returns partialFailures so the UI can notify the administrator
 *   without presenting broken or silently blank metrics.
 */
const loadReportsData = async (options) => {
  const results = await Promise.allSettled([
    dashboardApi.getAdmin(options),
    tripsApi.getAll(options),
    bookingsApi.getAll(options),
    reviewsApi.getAll(options),
    revenueApi.getOverview(options),
    revenueApi.getBreakdown(options),
    revenueApi.getTransactions(options),
    revenueApi.getConfig(options),
  ]);

  const [
    dashboardRes,
    tripsRes,
    bookingsRes,
    reviewsRes,
    overviewRes,
    breakdownRes,
    transactionsRes,
    configRes,
  ] = results;

  const partialFailures = [];
  if (dashboardRes.status === 'rejected') partialFailures.push('Dashboard metrics');
  if (tripsRes.status === 'rejected') partialFailures.push('Trips records');
  if (bookingsRes.status === 'rejected') partialFailures.push('Bookings records');
  if (reviewsRes.status === 'rejected') partialFailures.push('Reviews');
  if (overviewRes.status === 'rejected') partialFailures.push('Revenue overview');
  if (breakdownRes.status === 'rejected') partialFailures.push('Revenue category breakdown');
  if (transactionsRes.status === 'rejected') partialFailures.push('Transactions');
  if (configRes.status === 'rejected') partialFailures.push('Revenue configuration');

  return {
    dashboard:
      dashboardRes.status === 'fulfilled'
        ? dashboardRes.value
        : { totalTrips: 0, totalBookings: 0, totalRevenue: 0 },
    trips:
      tripsRes.status === 'fulfilled' && Array.isArray(tripsRes.value)
        ? tripsRes.value
        : [],
    bookings:
      bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value)
        ? bookingsRes.value
        : [],
    reviews:
      reviewsRes.status === 'fulfilled' && Array.isArray(reviewsRes.value)
        ? reviewsRes.value
        : [],
    overview:
      overviewRes.status === 'fulfilled'
        ? overviewRes.value
        : {
            totalRevenue: 0,
            thisMonthRevenue: 0,
            thisYearRevenue: 0,
            pendingRevenue: 0,
            settledRevenue: 0,
            grossBookingValue: 0,
            totalPayouts: 0,
          },
    breakdown:
      breakdownRes.status === 'fulfilled' ? breakdownRes.value : {},
    transactions:
      transactionsRes.status === 'fulfilled' && Array.isArray(transactionsRes.value)
        ? transactionsRes.value
        : [],
    config:
      configRes.status === 'fulfilled' && Array.isArray(configRes.value)
        ? configRes.value
        : [],
    partialFailures,
  };
};

/**
 * RFC 4180-compliant CSV serializer with formula injection sanitization.
 */
function sanitizeCsvValue(val) {
  if (val == null) return '';
  let str = String(val);
  // Formula injection mitigation (OWASP recommendation): prefix initial =, +, -, @
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  // Wrap in quotes and escape internal quotes if special characters exist
  if (/[",\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename, columns, rows) {
  const headerLine = columns.map((col) => sanitizeCsvValue(col.label)).join(',');
  const rowLines = rows.map((row) =>
    columns
      .map((col) => {
        const raw = col.getter ? col.getter(row) : row[col.key];
        return sanitizeCsvValue(raw);
      })
      .join(',')
  );

  // Prepend UTF-8 BOM so Excel and spreadsheet editors decode INR symbols properly
  const csvBlob = new Blob(['\uFEFF' + [headerLine, ...rowLines].join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const downloadUrl = URL.createObjectURL(csvBlob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Status distribution bar renderer.
 */
function Distribution({ title, rows }) {
  const counts = rows.reduce(
    (all, row) => ({ ...all, [row.status]: (all[row.status] || 0) + 1 }),
    {}
  );

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>{title}</h3>
      {rows.length > 0 ? (
        Object.entries(counts).map(([status, count]) => (
          <div className="admin-distribution" key={status}>
            <span style={{ minWidth: '100px' }}>{status}</span>
            <progress
              value={count}
              max={rows.length}
              aria-label={`${status}: ${count} of ${rows.length}`}
            />
            <span style={{ minWidth: '60px', textAlign: 'right' }}>
              {count} ({Math.round((count / rows.length) * 100)}%)
            </span>
          </div>
        ))
      ) : (
        <p className="admin-empty">No records found.</p>
      )}
    </section>
  );
}

export default function AdminReportsPage() {
  const resource = useAdminData(loadReportsData);
  const [transactionQuery, setTransactionQuery] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');

  const d = resource.data;

  // Filtered transactions for the report table
  const filteredTransactions = useMemo(() => {
    if (!d?.transactions) return [];
    return d.transactions.filter((t) => {
      const matchesStatus = !transactionStatus || t.status === transactionStatus;
      const matchesSearch = matches(
        [
          t.transaction_id,
          t.revenue_type,
          t.booking_reference,
          t.agency_id,
          t.guide_id,
          t.gross_amount,
          t.revenue_amount,
        ],
        transactionQuery
      );
      return matchesStatus && matchesSearch;
    });
  }, [d?.transactions, transactionStatus, transactionQuery]);

  // Export handlers
  const handleExportTransactions = () => {
    if (!d?.transactions) return;
    const exportColumns = [
      { label: 'Transaction ID', key: 'transaction_id' },
      { label: 'Revenue Type', key: 'revenue_type' },
      { label: 'Booking Reference', key: 'booking_reference' },
      { label: 'Agency ID', key: 'agency_id' },
      { label: 'Guide ID', key: 'guide_id' },
      { label: 'Gross Booking Value', getter: (t) => t.gross_amount },
      { label: 'Platform Revenue', getter: (t) => t.revenue_amount },
      { label: 'Partner Payout', getter: (t) => t.payout_amount },
      {
        label: 'Commission Rate (%)',
        getter: (t) => (t.commission_rate != null ? `${t.commission_rate}%` : 'N/A'),
      },
      { label: 'Settlement Status', key: 'status' },
      { label: 'Currency', key: 'currency' },
      { label: 'Created At', key: 'created_at' },
    ];
    downloadCsv('globesync_transactions_report.csv', exportColumns, filteredTransactions);
  };

  const handleExportTripsSummary = () => {
    if (!d?.trips) return;
    const exportColumns = [
      { label: 'Trip ID', key: 'tripId' },
      { label: 'Destination', key: 'destination' },
      { label: 'Traveler ID', key: 'travelerId' },
      { label: 'Agency ID', key: 'agencyId' },
      { label: 'Assigned Guide ID', key: 'guideId' },
      { label: 'Guide Status', key: 'guideStatus' },
      { label: 'Budget (INR)', key: 'budget' },
      { label: 'Start Date', key: 'startDate' },
      { label: 'End Date', key: 'endDate' },
      { label: 'Trip Lifecycle Status', key: 'status' },
    ];
    downloadCsv('globesync_trips_summary.csv', exportColumns, d.trips);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <AdminPage
      title="Financial & Operational Reports"
      resource={resource}
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportTransactions}
            disabled={resource.busy || !d?.transactions?.length}
            title="Download CSV export of financial transactions"
          >
            Export Transactions CSV
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportTripsSummary}
            disabled={resource.busy || !d?.trips?.length}
            title="Download CSV export of all trips"
          >
            Export Trips CSV
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrintReport}
            disabled={resource.busy}
            title="Open printable report layout"
          >
            Print Report
          </button>
        </div>
      }
    >
      {d && (
        <>
          {/* Print View Header (visible only when printing) */}
          <div className="admin-print-header" style={{ display: 'none' }}>
            <h1>GlobeSync Platform Operations & Financial Statement</h1>
            <p>
              Generated on {new Date().toLocaleString('en-IN')} &bull; Administrator Report
            </p>
          </div>

          {/* Partial Load Warning Banner */}
          {d.partialFailures.length > 0 && (
            <div className="admin-warning-banner" role="alert">
              <strong>⚠️ Partial Data Notice:</strong> The following datasets could not be
              retrieved: {d.partialFailures.join(', ')}. Displaying all available records and
              summaries.
            </div>
          )}

          {/* Core Metrics: Financial Volume vs. Platform Commission Revenue */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Financial Volume & Platform Commission
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
              Distinction Notice: Gross Booking Value represents the total travel expenditure
              booked. Platform Revenue reflects GlobeSync's earned commission and platform fees.
            </p>

            <Metrics
              items={[
                ['Gross Booking Value (GBV)', money(d.overview.grossBookingValue)],
                ['Platform Earned Revenue', money(d.overview.totalRevenue)],
                ['Settled Revenue', money(d.overview.settledRevenue)],
                ['Pending Settlement', money(d.overview.pendingRevenue)],
                ['Partner Payouts', money(d.overview.totalPayouts)],
                ['Month-to-Date Revenue', money(d.overview.thisMonthRevenue)],
                ['Year-to-Date Revenue', money(d.overview.thisYearRevenue)],
                ['Total Trips', d.dashboard.totalTrips],
                ['Total Bookings', d.dashboard.totalBookings],
                ['Verified Reviews', d.reviews.length],
              ]}
            />
          </section>

          {/* Operational Distribution Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <Distribution title="Trip Lifecycle Distribution" rows={d.trips} />
            <Distribution title="Booking Operational Distribution" rows={d.bookings} />
          </div>

          {/* Revenue by Category Breakdown */}
          <section style={{ marginTop: '2rem', marginBottom: '2.5rem' }}>
            <h2>Earned Revenue by Category</h2>
            <AdminTable
              rowKey="category"
              rows={Object.entries(d.breakdown).map(([category, amount]) => ({
                category,
                amount,
              }))}
              columns={[
                { label: 'Category', key: 'category' },
                {
                  label: 'Earned / Settled Revenue (INR)',
                  render: (row) => money(row.amount),
                },
              ]}
            />
          </section>

          {/* Transactions Detail with Filter & Export */}
          <section style={{ marginTop: '2.5rem', marginBottom: '2.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h2>Financial Transactions Ledger</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleExportTransactions}
              >
                Export CSV ({filteredTransactions.length} rows)
              </button>
            </div>

            <Filters
              query={transactionQuery}
              setQuery={setTransactionQuery}
              status={transactionStatus}
              setStatus={setTransactionStatus}
              statuses={[...new Set(d.transactions.map((t) => t.status).filter(Boolean))]}
            />

            <AdminTable
              rowKey="transaction_id"
              rows={filteredTransactions}
              columns={[
                { label: 'ID', key: 'transaction_id' },
                { label: 'Type', key: 'revenue_type' },
                { label: 'Booking Ref', key: 'booking_reference' },
                { label: 'Agency ID', key: 'agency_id' },
                { label: 'Guide ID', key: 'guide_id' },
                {
                  label: 'Gross (INR)',
                  render: (t) => money(t.gross_amount, t.currency),
                },
                {
                  label: 'Revenue (INR)',
                  render: (t) => money(t.revenue_amount, t.currency),
                },
                {
                  label: 'Payout (INR)',
                  render: (t) => money(t.payout_amount, t.currency),
                },
                {
                  label: 'Rate',
                  render: (t) =>
                    t.commission_rate == null ? '-' : `${t.commission_rate}%`,
                },
                {
                  label: 'Status',
                  render: (t) => <StatusBadge status={t.status} />,
                },
                { label: 'Created At', key: 'created_at' },
              ]}
            />
          </section>

          {/* Revenue Configuration Parameters */}
          <section style={{ marginTop: '2.5rem' }}>
            <h2>Platform Revenue Rules & Parameters</h2>
            <AdminTable
              rowKey="key_name"
              rows={d.config}
              columns={[
                { label: 'Parameter Key', key: 'key_name' },
                { label: 'Configured Value', key: 'value_number' },
                { label: 'Rule Description', key: 'description' },
              ]}
            />
          </section>
        </>
      )}
    </AdminPage>
  );
}
