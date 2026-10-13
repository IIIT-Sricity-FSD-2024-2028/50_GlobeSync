import React, { useState } from 'react';
import { dashboardApi, tripsApi, bookingsApi, reviewsApi, revenueApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import { AdminPage, AdminTable, Filters, Metrics, money, matches, useAdminData } from '../../components/admin/AdminUI';

const load = async options => {
  const [dashboard, trips, bookings, reviews, overview, breakdown, transactions, config] = await Promise.all([
    dashboardApi.getAdmin(options), tripsApi.getAll(options), bookingsApi.getAll(options), reviewsApi.getAll(options),
    revenueApi.getOverview(options), revenueApi.getBreakdown(options), revenueApi.getTransactions(options), revenueApi.getConfig(options),
  ]);
  return { dashboard, trips, bookings, reviews, overview, breakdown, transactions, config };
};
function Distribution({ title, rows }) {
  const counts = rows.reduce((all, row) => ({ ...all, [row.status]: (all[row.status] || 0) + 1 }), {});
  return <section><h2>{title}</h2>{rows.length ? Object.entries(counts).map(([status, count]) =>
    <div className="admin-distribution" key={status}><span>{status}</span><progress value={count} max={rows.length} aria-label={`${status}: ${count} of ${rows.length}`} /><span>{count}</span></div>
  ) : <p className="admin-empty">No records.</p>}</section>;
}
export default function AdminReportsPage() {
  const resource = useAdminData(load);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const d = resource.data;
  const rows = d?.transactions.filter(t => (!status || t.status === status) && matches([t.transaction_id, t.revenue_type, t.booking_reference, t.agency_id, t.guide_id], query)) || [];
  return <AdminPage title="Reports" resource={resource}>
    {d && <>
      <Metrics items={[
        ['Trips', d.dashboard.totalTrips], ['Bookings', d.dashboard.totalBookings], ['Reviews', d.reviews.length],
        ['Platform revenue (INR)', money(d.overview.totalRevenue)],
        ['This month (INR)', money(d.overview.thisMonthRevenue)], ['This year (INR)', money(d.overview.thisYearRevenue)],
        ['Pending revenue (INR)', money(d.overview.pendingRevenue)], ['Settled revenue (INR)', money(d.overview.settledRevenue)],
        ['Gross booking value (INR)', money(d.overview.grossBookingValue)], ['Payouts (INR)', money(d.overview.totalPayouts)],
      ]} />
      <Distribution title="Trip status distribution" rows={d.trips} />
      <Distribution title="Booking status distribution" rows={d.bookings} />
      <h2>Revenue by category (INR)</h2>
      <AdminTable rowKey="category" rows={Object.entries(d.breakdown).map(([category, amount]) => ({ category, amount }))} columns={[
        { label: 'Category', key: 'category' }, { label: 'Earned / settled revenue', render: row => money(row.amount) },
      ]} />
      <h2>Transactions</h2>
      <Filters {...{ query, setQuery, status, setStatus }} statuses={[...new Set(d.transactions.map(t => t.status))]} />
      <AdminTable rowKey="transaction_id" rows={rows} columns={[
        { label: 'ID', key: 'transaction_id' }, { label: 'Type', key: 'revenue_type' },
        { label: 'Booking reference', key: 'booking_reference' }, { label: 'Agency ID', key: 'agency_id' },
        { label: 'Guide ID', key: 'guide_id' }, { label: 'Gross', render: t => money(t.gross_amount, t.currency) },
        { label: 'Revenue', render: t => money(t.revenue_amount, t.currency) },
        { label: 'Payout', render: t => money(t.payout_amount, t.currency) },
        { label: 'Rate', render: t => t.commission_rate == null ? '-' : `${t.commission_rate}%` },
        { label: 'Status', render: t => <StatusBadge status={t.status} /> },
        { label: 'Created', key: 'created_at' },
      ]} />
      <h2>Revenue configuration</h2>
      <AdminTable rowKey="key_name" rows={d.config} columns={[
        { label: 'Key', key: 'key_name' }, { label: 'Value', key: 'value_number' }, { label: 'Description', key: 'description' },
      ]} />
    </>}
  </AdminPage>;
}
