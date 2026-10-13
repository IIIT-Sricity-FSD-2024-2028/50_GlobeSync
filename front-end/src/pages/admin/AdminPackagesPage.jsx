import React, { useState } from 'react';
import { packagesApi } from '../../services/api';
import { resolvePackageImage } from '../../components/packages/PackageCard';
import { AdminPage, AdminTable, Filters, AdminDialog, Field, FormActions, DeleteDialog, matches, money, useAdminData } from '../../components/admin/AdminUI';

const blank = { name: '', destinations: '', budget: '', duration: '', description: '', highlights: '', image: '' };
export default function AdminPackagesPage() {
  const resource = useAdminData(packagesApi.getAll);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [deleting, setDeleting] = useState(null);
  const change = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const open = pkg => { setEditing(pkg || {}); setForm(pkg ? Object.fromEntries(Object.keys(blank).map(k => [k, pkg[k] ?? ''])) : blank); };
  const rows = resource.data?.filter(p => matches([p.packageId, p.name, p.destinations, p.highlights], query)) || [];
  const save = e => {
    e.preventDefault();
    const payload = { ...form, name: form.name.trim(), destinations: form.destinations.trim(), budget: Number(form.budget), duration: Number(form.duration) };
    resource.run(() => editing.packageId ? packagesApi.update(editing.packageId, payload) : packagesApi.create(payload), 'Package saved.', () => setEditing(null));
  };
  return <AdminPage title="Packages" resource={resource} actions={<button className="btn btn-primary" disabled={resource.busy} onClick={() => open(null)}>Create package</button>}>
    {resource.data && <><Filters {...{ query, setQuery }} /><AdminTable rowKey="packageId" rows={rows} columns={[
      { label: 'Image', render: p => <img className="admin-package-image" src={resolvePackageImage(p.image)} alt={p.name} onError={e => { if (!e.currentTarget.src.endsWith('/destinations/default-trip.png')) e.currentTarget.src = '/destinations/default-trip.png'; }} /> },
      { label: 'ID', key: 'packageId' }, { label: 'Name', key: 'name' }, { label: 'Destinations', key: 'destinations' },
      { label: 'Days', key: 'duration' }, { label: 'Budget', render: p => money(p.budget) },
      { label: 'Actions', render: p => <div className="admin-actions"><button className="btn btn-secondary btn-sm" onClick={() => open(p)}>Edit</button><button className="btn btn-danger btn-sm" onClick={() => setDeleting(p)}>Delete</button></div> },
    ]} /></>}
    {editing && <AdminDialog title={editing.packageId ? 'Edit package' : 'Create package'} onClose={() => setEditing(null)} busy={resource.busy}>
      <form onSubmit={save}>
        <Field label="Name" name="name" value={form.name} onChange={change} required pattern=".*\S.*" disabled={resource.busy} />
        <Field label="Destinations" name="destinations" value={form.destinations} onChange={change} required pattern=".*\S.*" disabled={resource.busy} />
        <Field label="Budget (INR)" name="budget" type="number" min="0" step="0.01" value={form.budget} onChange={change} required disabled={resource.busy} />
        <Field label="Duration (days)" name="duration" type="number" min="1" step="1" value={form.duration} onChange={change} required disabled={resource.busy} />
        <label className="admin-field">Description<textarea name="description" rows="3" value={form.description} onChange={change} disabled={resource.busy} /></label>
        <Field label="Highlights" name="highlights" value={form.highlights} onChange={change} disabled={resource.busy} />
        <Field label="Image URL or path" name="image" value={form.image} onChange={change} disabled={resource.busy} />
        {resource.error && <p className="admin-error" role="alert">{resource.error}</p>}
        <FormActions busy={resource.busy} onCancel={() => setEditing(null)} />
      </form>
    </AdminDialog>}
    {deleting && <DeleteDialog title={`Delete ${deleting.name}?`} warning="This permanently removes the package from the shared catalog. Existing trips may still refer to this package. Historical references are not removed." busy={resource.busy} error={resource.error} onClose={() => setDeleting(null)}
      onConfirm={() => resource.run(() => packagesApi.delete(deleting.packageId), 'Package deleted.', () => setDeleting(null))} />}
  </AdminPage>;
}
