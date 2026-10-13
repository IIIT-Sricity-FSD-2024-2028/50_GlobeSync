import React, { useState } from 'react';
import { agenciesApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import { AdminPage, AdminTable, Filters, AdminDialog, Field, SelectField, FormActions, DeleteDialog, Details, agencyStatuses, matches, useAdminData } from '../../components/admin/AdminUI';

const blank = { businessName: '', contactEmail: '', contactPhone: '', password: '', status: 'approved', commissionRate: '' };
export default function AdminAgenciesPage() {
  const resource = useAdminData(agenciesApi.getAll);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [statusAgency, setStatusAgency] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'pending', commissionRate: '' });
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const change = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const open = agency => { setEditing(agency || {}); setForm(agency ? { ...blank, ...agency, password: '' } : blank); };
  const rows = resource.data?.filter(a => (!status || a.status === status) && matches([a.agencyId, a.businessName, a.contactEmail, a.contactPhone], query)) || [];
  const save = e => {
    e.preventDefault();
    const payload = { businessName: form.businessName.trim(), contactEmail: form.contactEmail.trim(), contactPhone: form.contactPhone.trim() };
    if (!editing.agencyId) {
      payload.password = form.password;
      payload.status = form.status;
      if (form.commissionRate !== '') payload.commissionRate = Number(form.commissionRate);
    }
    resource.run(() => editing.agencyId ? agenciesApi.update(editing.agencyId, payload) : agenciesApi.create(payload), 'Agency saved.', () => setEditing(null));
  };
  return <AdminPage title="Agencies" resource={resource} actions={<button className="btn btn-primary" disabled={resource.busy} onClick={() => open(null)}>Create agency</button>}>
    {resource.data && <><Filters {...{ query, setQuery, status, setStatus }} statuses={agencyStatuses} />
      <AdminTable rowKey="agencyId" rows={rows} columns={[
        { label: 'ID', key: 'agencyId' }, { label: 'Business', key: 'businessName' },
        { label: 'Email', key: 'contactEmail' }, { label: 'Phone', key: 'contactPhone' },
        { label: 'Status', render: a => <StatusBadge status={a.status} /> },
        { label: 'Commission', render: a => a.commissionRate == null ? 'Default' : `${a.commissionRate}%` },
        { label: 'Actions', render: a => <div className="admin-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => resource.run(() => agenciesApi.getById(a.agencyId), 'Agency details loaded.', setViewing)}>View</button>
          <button className="btn btn-secondary btn-sm" onClick={() => open(a)}>Edit</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setStatusAgency(a); setStatusForm({ status: a.status, commissionRate: a.commissionRate ?? '' }); }}>Status / rate</button>
          <button className="btn btn-danger btn-sm" onClick={() => setDeleting(a)}>Delete</button>
        </div> },
      ]} /></>}
    {viewing && <AdminDialog title={viewing.businessName} onClose={() => setViewing(null)} busy={false}>
      <Details entries={[['ID', viewing.agencyId], ['Email', viewing.contactEmail], ['Phone', viewing.contactPhone], ['Status', viewing.status], ['Commission', viewing.commissionRate == null ? 'Default' : `${viewing.commissionRate}%`], ['Created', viewing.createdAt]]} />
    </AdminDialog>}
    {editing && <AdminDialog title={editing.agencyId ? 'Edit agency' : 'Create agency'} onClose={() => setEditing(null)} busy={resource.busy}>
      <form onSubmit={save}>
        <Field label="Business name" name="businessName" value={form.businessName} onChange={change} required pattern=".*\S.*" disabled={resource.busy} />
        <Field label="Contact email" name="contactEmail" type="email" value={form.contactEmail} onChange={change} required disabled={resource.busy} />
        <Field label="Contact phone" name="contactPhone" value={form.contactPhone} onChange={change} required pattern=".*\S.*" disabled={resource.busy} />
        {!editing.agencyId && <>
          <Field label="Initial password" name="password" type="password" autoComplete="new-password" minLength="6" value={form.password} onChange={change} required disabled={resource.busy} />
          <SelectField label="Status" name="status" values={agencyStatuses} value={form.status} onChange={change} disabled={resource.busy} />
          <Field label="Commission rate (%)" name="commissionRate" type="number" min="1" max="1.5" step="0.01" value={form.commissionRate} onChange={change} disabled={resource.busy} />
        </>}
        {resource.error && <p className="admin-error" role="alert">{resource.error}</p>}
        <FormActions busy={resource.busy} onCancel={() => setEditing(null)} />
      </form>
    </AdminDialog>}
    {statusAgency && <AdminDialog title={`Status: ${statusAgency.businessName}`} onClose={() => setStatusAgency(null)} busy={resource.busy}>
      <form onSubmit={e => { e.preventDefault(); const payload = { status: statusForm.status }; if (statusForm.commissionRate !== '') payload.commissionRate = Number(statusForm.commissionRate); resource.run(() => agenciesApi.updateStatus(statusAgency.agencyId, payload), 'Agency status and commission updated.', () => setStatusAgency(null)); }}>
        <SelectField label="Status" values={agencyStatuses} value={statusForm.status} onChange={e => setStatusForm(p => ({ ...p, status: e.target.value }))} disabled={resource.busy} />
        <Field label="Commission rate (%)" type="number" min="1" max="1.5" step="0.01" value={statusForm.commissionRate} onChange={e => setStatusForm(p => ({ ...p, commissionRate: e.target.value }))} disabled={resource.busy} />
        <p>Only approved agencies can sign in. Leaving the rate blank preserves the existing rate.</p>
        {resource.error && <p className="admin-error" role="alert">{resource.error}</p>}
        <FormActions busy={resource.busy} onCancel={() => setStatusAgency(null)} />
      </form>
    </AdminDialog>}
    {deleting && <DeleteDialog title={`Delete ${deleting.businessName}?`} warning="This permanently removes the agency and its login access. Trips, passengers and financial records remain and may reference the deleted agency." busy={resource.busy} error={resource.error} onClose={() => setDeleting(null)}
      onConfirm={() => resource.run(() => agenciesApi.delete(deleting.agencyId), 'Agency deleted.', () => setDeleting(null))} />}
  </AdminPage>;
}
