import React, { useState } from 'react';
import { tripsApi, travelersApi, agenciesApi, guidesApi, packagesApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import { AdminPage, AdminTable, Filters, AdminDialog, SelectField, FormActions, Details, tripStatuses, matches, money, ownerLabel, useAdminData } from '../../components/admin/AdminUI';

const load = async options => {
  const [trips, travelers, agencies, guides, packages] = await Promise.all([
    tripsApi.getAll(options), travelersApi.getAll(options), agenciesApi.getAll(options), guidesApi.getAll(options), packagesApi.getAll(options),
  ]);
  return { trips, travelers, agencies, guides, packages };
};
export default function AdminTripsPage() {
  const resource = useAdminData(load);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const d = resource.data;
  const owner = row => ownerLabel(row, d?.travelers, d?.agencies);
  const guide = row => row.guideId == null ? 'Unassigned' : d?.guides.find(g => g.guideId === row.guideId)?.name || `Guide #${row.guideId}`;
  const rows = d?.trips.filter(t => (!status || t.status === status) && matches([t.tripId, t.destination, owner(t), guide(t), t.guideStatus], query)) || [];
  return <AdminPage title="Trips Oversight" resource={resource}>
    {d && <><Filters {...{ query, setQuery, status, setStatus }} statuses={tripStatuses} />
      <AdminTable rowKey="tripId" rows={rows} columns={[
        { label: 'ID', render: t => `#${t.tripId}` }, { label: 'Destination', key: 'destination' },
        { label: 'Customer', render: owner }, { label: 'Dates', render: t => `${t.startDate} - ${t.endDate}` },
        { label: 'Guide', render: guide }, { label: 'Guide response', render: t => t.guideStatus || '-' },
        { label: 'Status', render: t => <StatusBadge status={t.status} /> },
        { label: 'Actions', render: t => <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(t); setNextStatus(t.status); }}>View / update</button> },
      ]} /></>}
    {selected && <AdminDialog title={`Trip #${selected.tripId}`} busy={resource.busy} onClose={() => setSelected(null)}>
      <Details entries={[
        ['Destination', selected.destination], ['Customer', owner(selected)],
        ['Start date', selected.startDate], ['End date', selected.endDate],
        ['Budget', money(selected.budget)], ['Guide', guide(selected)], ['Guide response', selected.guideStatus],
        ['Package', selected.packageId == null ? 'Custom trip' : d?.packages.find(p => p.packageId === selected.packageId)?.name || `Package #${selected.packageId}`],
      ]} />
      <form onSubmit={e => { e.preventDefault(); resource.run(() => tripsApi.updateStatus(selected.tripId, nextStatus), 'Trip status updated.', () => setSelected(null)); }}>
        <SelectField label="Trip status" values={tripStatuses} value={nextStatus} onChange={e => setNextStatus(e.target.value)} required disabled={resource.busy} />
        {nextStatus !== selected.status && <p>Change {selected.status} to {nextStatus}?{nextStatus === 'Completed' ? ' Completing this trip settles pending agency commission entries.' : ''}</p>}
        {resource.error && <p className="admin-error" role="alert">{resource.error}</p>}
        <FormActions busy={resource.busy} onCancel={() => setSelected(null)} />
      </form>
    </AdminDialog>}
  </AdminPage>;
}
