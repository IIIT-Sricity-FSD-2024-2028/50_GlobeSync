import React, { useState } from 'react';
import { bookingsApi, tripsApi, travelersApi, agenciesApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import { AdminPage, AdminTable, Filters, AdminDialog, SelectField, FormActions, Details, bookingStatuses, matches, money, ownerLabel, useAdminData } from '../../components/admin/AdminUI';

const load = async options => {
  const [bookings, trips, travelers, agencies] = await Promise.all([
    bookingsApi.getAll(options), tripsApi.getAll(options), travelersApi.getAll(options), agenciesApi.getAll(options),
  ]);
  return { bookings, trips, travelers, agencies };
};
export default function AdminBookingsPage() {
  const resource = useAdminData(load);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const d = resource.data;
  const owner = row => ownerLabel(row, d?.travelers, d?.agencies);
  const destination = row => d?.trips.find(t => t.tripId === row.tripId)?.destination || `Trip #${row.tripId}`;
  const rows = d?.bookings.filter(b => (!status || b.status === status) &&
    matches([b.bookingId, b.service, b.type, b.status, destination(b), owner(b)], query)) || [];
  return <AdminPage title="Bookings" resource={resource}>
    {d && <><Filters {...{ query, setQuery, status, setStatus }} statuses={bookingStatuses} />
      <AdminTable rowKey="bookingId" rows={rows} columns={[
        { label: 'ID', render: b => `#${b.bookingId}` }, { label: 'Service', key: 'service' },
        { label: 'Type', key: 'type' }, { label: 'Trip', render: destination },
        { label: 'Customer', render: owner }, { label: 'Date', key: 'bookingDate' },
        { label: 'Amount', render: b => money(b.amount) },
        { label: 'Status', render: b => <StatusBadge status={b.status} /> },
        { label: 'Actions', render: b => <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(b); setNextStatus(b.status); }}>View / update</button> },
      ]} /></>}
    {selected && <AdminDialog title={`Booking #${selected.bookingId}`} busy={resource.busy} onClose={() => setSelected(null)}>
      <Details entries={[
        ['Service', selected.service], ['Trip', destination(selected)], ['Customer', owner(selected)],
        ['Booking date', selected.bookingDate], ['Amount', money(selected.amount)],
        ['Transport mode', selected.transportMode],
        ['Insurance selected', selected.insuranceSelected ? 'Yes' : 'No'],
        ['Insurance rate', selected.insuranceRate == null ? '-' : `${selected.insuranceRate}%`],
        ['Insurance amount', selected.insuranceAmount == null ? '-' : money(selected.insuranceAmount)],
        ['Cancellation protection', selected.cancellationProtectionSelected ? 'Yes' : 'No'],
        ['Cancellation fee', selected.cancellationFee == null ? '-' : money(selected.cancellationFee)],
      ]} />
      <form onSubmit={e => { e.preventDefault(); resource.run(() => bookingsApi.update(selected.bookingId, { status: nextStatus }), 'Booking status updated.', () => setSelected(null)); }}>
        <SelectField label="Booking status" values={bookingStatuses} value={nextStatus} onChange={e => setNextStatus(e.target.value)} required disabled={resource.busy} />
        {resource.error && <p className="admin-error" role="alert">{resource.error}</p>}
        <FormActions busy={resource.busy} onCancel={() => setSelected(null)} />
      </form>
    </AdminDialog>}
  </AdminPage>;
}
