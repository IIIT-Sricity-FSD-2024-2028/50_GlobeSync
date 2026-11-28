import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminReports } from '../../store/admin-reports/admin-reports-actions';
import { adminReportsActions } from '../../store/admin-reports/admin-reports-slice';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  Filters,
  Metrics,
  money,
} from '../../components/admin/AdminUI';

function sanitizeCsvValue(val) {
  if (val == null) return '';
  let str = String(val);
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
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

function Distribution({ title, rows = [] }) {
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
  const dispatch = useDispatch();

  const dashboard = useSelector((state) => state.adminReports.dashboard);
  const overview = useSelector((state) => state.adminReports.overview);
  const breakdown = useSelector((state) => state.adminReports.breakdown);
  const transactions = useSelector((state) => state.adminReports.transactions);
  const config = useSelector((state) => state.adminReports.config);
  const trips = useSelector((state) => state.adminReports.trips);
  const bookings = useSelector((state) => state.adminReports.bookings);
  const reviews = useSelector((state) => state.adminReports.reviews);
  const partialFailures = useSelector((state) => state.adminReports.partialFailures);
  const transactionSearch = useSelector((state) => state.adminReports.transactionSearch);
  const transactionStatus = useSelector((state) => state.adminReports.transactionStatus);
  const exportStatus = useSelector((state) => state.adminReports.exportStatus);
  const loading = useSelector((state) => state.adminReports.loading);
  const error = useSelector((state) => state.adminReports.error);

  useEffect(() => {
    dispatch(fetchAdminReports());
  }, [dispatch]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((t) => {
      if (transactionStatus !== 'all' && t.status !== transactionStatus) return false;
      if (transactionSearch.trim()) {
        const q = transactionSearch.toLowerCase();
        return (
          String(t.transaction_id ?? '').toLowerCase().includes(q) ||
          (t.revenue_type ?? '').toLowerCase().includes(q) ||
          (t.booking_reference ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, transactionStatus, transactionSearch]);

  const handleExportTransactions = () => {
    if (!transactions?.length) return;
    dispatch(adminReportsActions.setExportStatus('exporting'));
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
    dispatch(adminReportsActions.setExportStatus('idle'));
  };

  const handleExportTripsSummary = () => {
    if (!trips?.length) return;
    dispatch(adminReportsActions.setExportStatus('exporting'));
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
    downloadCsv('globesync_trips_summary.csv', exportColumns, trips);
    dispatch(adminReportsActions.setExportStatus('idle'));
  };

  const hasData = Boolean(dashboard || overview || transactions?.length);

  const resource = {
    loading,
    busy: loading || exportStatus === 'exporting',
    load: () => dispatch(fetchAdminReports({ force: true })),
    error,
    data: hasData ? true : null,
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
            disabled={resource.busy || !transactions?.length}
            title="Download CSV export of financial transactions"
          >
            Export Transactions CSV
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportTripsSummary}
            disabled={resource.busy || !trips?.length}
            title="Download CSV export of all trips"
          >
            Export Trips CSV
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
            disabled={resource.busy}
            title="Open printable report layout"
          >
            Print Report
          </button>
        </div>
      }
    >
      {hasData && (
        <>
          <div className="admin-print-header" style={{ display: 'none' }}>
            <h1>GlobeSync Platform Operations & Financial Statement</h1>
            <p>
              Generated on {new Date().toLocaleString('en-IN')} &bull; Administrator Report
            </p>
          </div>

          {partialFailures?.length > 0 && (
            <div className="admin-warning-banner" role="alert">
              <strong>⚠️ Partial Data Notice:</strong> The following datasets could not be
              retrieved: {partialFailures.join(', ')}. Displaying all available records and summaries.
            </div>
          )}

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
                ['Gross Booking Value (GBV)', money(overview?.grossBookingValue || 0)],
                ['Platform Earned Revenue', money(overview?.totalRevenue || 0)],
                ['Settled Revenue', money(overview?.settledRevenue || 0)],
                ['Pending Settlement', money(overview?.pendingRevenue || 0)],
                ['Partner Payouts', money(overview?.totalPayouts || 0)],
                ['Month-to-Date Revenue', money(overview?.thisMonthRevenue || 0)],
                ['Year-to-Date Revenue', money(overview?.thisYearRevenue || 0)],
                ['Total Trips', dashboard?.totalTrips || 0],
                ['Total Bookings', dashboard?.totalBookings || 0],
                ['Verified Reviews', reviews?.length || 0],
              ]}
            />
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <Distribution title="Trip Lifecycle Distribution" rows={trips || []} />
            <Distribution title="Booking Operational Distribution" rows={bookings || []} />
          </div>

          <section style={{ marginTop: '2rem', marginBottom: '2.5rem' }}>
            <h2>Earned Revenue by Category</h2>
            <AdminTable
              rowKey="category"
              rows={Object.entries(breakdown || {}).map(([category, amount]) => ({
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
              query={transactionSearch}
              setQuery={(val) => dispatch(adminReportsActions.setTransactionSearch(val))}
              status={transactionStatus}
              setStatus={(val) => dispatch(adminReportsActions.setTransactionStatus(val))}
              statuses={[...new Set((transactions || []).map((t) => t.status).filter(Boolean))]}
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

          <section style={{ marginTop: '2.5rem' }}>
            <h2>Platform Revenue Rules & Parameters</h2>
            <AdminTable
              rowKey="key_name"
              rows={config || []}
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
