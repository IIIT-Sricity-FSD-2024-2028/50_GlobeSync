import React, { useCallback, useEffect, useState } from 'react';
import { adminsApi } from '../../services/api';
import { useSession } from '../../context/SessionContext';
import { AdminPage, Details, Field, useAdminData } from '../../components/admin/AdminUI';

export default function AdminProfilePage() {
  const { user, updateUser } = useSession();
  const id = user?.adminId ?? user?.admin_id ?? user?.id;
  const load = useCallback(options => {
    if (!id) return Promise.reject(new Error('The current session does not contain an Admin ID.'));
    return adminsApi.getById(id, options);
  }, [id]);
  const resource = useAdminData(load);
  const [form, setForm] = useState({ name: '', email: '' });
  useEffect(() => { if (resource.data) setForm({ name: resource.data.name, email: resource.data.email }); }, [resource.data]);
  return <AdminPage title="Profile" resource={resource}>
    {resource.data && <>
      <Details entries={[['Admin ID', resource.data.adminId], ['Role', resource.data.role]]} />
      <form className="admin-profile-form" onSubmit={e => {
        e.preventDefault();
        resource.run(() => adminsApi.update(id, { name: form.name.trim(), email: form.email.trim() }), 'Profile updated.', updateUser);
      }}>
        <Field label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required pattern=".*\S.*" disabled={resource.busy} autoComplete="name" />
        <Field label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required disabled={resource.busy} autoComplete="email" />
        <button className="btn btn-primary" type="submit" disabled={resource.busy}>{resource.busy ? 'Saving...' : 'Save profile'}</button>
      </form>
    </>}
  </AdminPage>;
}
