import React, { useEffect, useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { useReduxAdminData } from '../../store/hooks';
import { AdminPage, Details, Field } from '../../components/admin/AdminUI';

export default function AdminProfilePage() {
  const { user, updateUser } = useSession();
  const id = user?.adminId ?? user?.admin_id ?? user?.id;
  const resource = useReduxAdminData('adminProfile', { id }, { load: Boolean(id) });
  const [form, setForm] = useState({ name: '', email: '' });
  useEffect(() => { if (resource.data) setForm({ name: resource.data.name, email: resource.data.email }); }, [resource.data]);
  return <AdminPage title="Profile" resource={resource}>
    {resource.data && <>
      <Details entries={[['Admin ID', resource.data.adminId], ['Role', resource.data.role]]} />
      <form className="admin-profile-form" onSubmit={e => {
        e.preventDefault();
        resource.run('saveProfile', [id, { name: form.name.trim(), email: form.email.trim() }], 'Profile updated.', updateUser);
      }}>
        <Field label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required pattern=".*\S.*" disabled={resource.busy} autoComplete="name" />
        <Field label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required disabled={resource.busy} autoComplete="email" />
        <button className="btn btn-primary" type="submit" disabled={resource.busy}>{resource.busy ? 'Saving...' : 'Save profile'}</button>
      </form>
    </>}
  </AdminPage>;
}
