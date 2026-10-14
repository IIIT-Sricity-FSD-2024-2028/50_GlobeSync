import React, { useState } from 'react';
import { travelersApi, guidesApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  Filters,
  AdminDialog,
  Field,
  SelectField,
  FormActions,
  DeleteDialog,
  Details,
  matches,
  useAdminData,
} from '../../components/admin/AdminUI';

const loadUsers = async (options) => {
  const [travelers, guides] = await Promise.all([
    travelersApi.getAll(options),
    guidesApi.getAll(options),
  ]);

  const tList = (Array.isArray(travelers) ? travelers : []).map((t) => ({
    id: `T${t.travelerId}`,
    numericId: t.travelerId,
    role: 'Traveler',
    name: t.name,
    email: t.email,
    phone: t.phone || 'N/A',
    status: t.status || 'Active',
    raw: t,
  }));

  const gList = (Array.isArray(guides) ? guides : []).map((g) => ({
    id: `G${g.guideId}`,
    numericId: g.guideId,
    role: 'Guide',
    name: g.name,
    email: g.email || 'N/A',
    phone: g.contact || 'N/A',
    status: g.status || 'Active',
    languages: Array.isArray(g.languages) ? g.languages.join(', ') : g.languages || '',
    experience: g.experience ?? 0,
    feePerTrip: g.feePerTrip ?? 0,
    rating: g.rating ?? 5.0,
    raw: g,
  }));

  return [...tList, ...gList];
};

const blankUser = {
  role: 'Guide',
  name: '',
  email: '',
  phone: '',
  password: '',
  languages: 'English',
  experience: '2',
  feePerTrip: '1500',
  status: 'Active',
};

export default function SuperUsersPage() {
  const resource = useAdminData(loadUsers);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankUser);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const change = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const openCreate = (defaultRole = 'Guide') => {
    setEditing({});
    setForm({ ...blankUser, role: defaultRole });
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      role: user.role,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone === 'N/A' ? '' : user.phone,
      password: '',
      languages: user.languages || '',
      experience: String(user.experience ?? 0),
      feePerTrip: String(user.feePerTrip ?? 0),
      status: user.status || 'Active',
    });
  };

  const rows = (resource.data || []).filter((u) => {
    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesStatus = !statusFilter || u.status === statusFilter;
    const matchesQuery = matches([u.id, u.name, u.email, u.phone, u.role], query);
    return matchesRole && matchesStatus && matchesQuery;
  });

  const save = (e) => {
    e.preventDefault();
    const isNew = !editing.id;

    if (isNew) {
      if (form.role === 'Guide') {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password || 'guide123',
          contact: form.phone.trim(),
          languages: form.languages
            ? form.languages.split(',').map((s) => s.trim()).filter(Boolean)
            : ['English'],
          experience: Number(form.experience) || 0,
          feePerTrip: Number(form.feePerTrip) || 0,
        };
        resource.run(
          () => guidesApi.create(payload),
          'New Tour Guide registered successfully!',
          () => setEditing(null)
        );
      } else {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password || 'traveler123',
          phone: form.phone.trim(),
        };
        resource.run(
          () => travelersApi.create(payload),
          'New Traveler registered successfully!',
          () => setEditing(null)
        );
      }
    } else {
      // Editing existing user
      if (editing.role === 'Guide') {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          contact: form.phone.trim(),
          languages: form.languages
            ? form.languages.split(',').map((s) => s.trim()).filter(Boolean)
            : ['English'],
          experience: Number(form.experience) || 0,
          feePerTrip: Number(form.feePerTrip) || 0,
        };
        resource.run(
          () => guidesApi.update(editing.numericId, payload),
          'Guide details updated.',
          () => setEditing(null)
        );
      } else {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        };
        resource.run(
          () => travelersApi.update(editing.numericId, payload),
          'Traveler details updated.',
          () => setEditing(null)
        );
      }
    }
  };

  const confirmDelete = () => {
    if (!deleting) return;
    if (deleting.role === 'Guide') {
      resource.run(
        () => guidesApi.delete(deleting.numericId),
        `Guide ${deleting.name} (#${deleting.id}) deleted.`,
        () => setDeleting(null)
      );
    } else {
      resource.run(
        () => travelersApi.delete(deleting.numericId),
        `Traveler ${deleting.name} (#${deleting.id}) deleted.`,
        () => setDeleting(null)
      );
    }
  };

  return (
    <AdminPage
      title="User Directory & Lifecycle"
      resource={resource}
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-primary"
            disabled={resource.busy}
            onClick={() => openCreate('Guide')}
          >
            + Register Guide
          </button>
          <button
            className="btn btn-secondary"
            disabled={resource.busy}
            onClick={() => openCreate('Traveler')}
          >
            + Add Traveler
          </button>
        </div>
      }
    >
      {resource.data && (
        <>
          <div className="admin-filters">
            <label>
              Search
              <input
                aria-label="Search users"
                type="search"
                placeholder="Name, email, phone, ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label>
              Role
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="Traveler">Travelers</option>
                <option value="Guide">Tour Guides</option>
              </select>
            </label>
            <label>
              Status
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>

          <AdminTable
            rowKey="id"
            rows={rows}
            columns={[
              { label: 'User ID', key: 'id' },
              { label: 'Name', key: 'name' },
              {
                label: 'Role',
                render: (u) => (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: u.role === 'Guide' ? '#e0e7ff' : '#ecfdf5',
                      color: u.role === 'Guide' ? '#3730a3' : '#065f46',
                    }}
                  >
                    {u.role}
                  </span>
                ),
              },
              { label: 'Email', key: 'email' },
              { label: 'Contact', key: 'phone' },
              {
                label: 'Status',
                render: (u) => <StatusBadge status={u.status} />,
              },
              {
                label: 'Actions',
                render: (u) => (
                  <div className="admin-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setViewing(u)}
                    >
                      View
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEdit(u)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleting(u)}
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      {/* View User Dialog */}
      {viewing && (
        <AdminDialog
          title={`User Details: ${viewing.name}`}
          onClose={() => setViewing(null)}
          busy={false}
        >
          <Details
            entries={[
              ['ID', viewing.id],
              ['Full Name', viewing.name],
              ['Role', viewing.role],
              ['Email Address', viewing.email],
              ['Phone Number', viewing.phone],
              ['Account Status', viewing.status],
              ...(viewing.role === 'Guide'
                ? [
                    ['Languages', viewing.languages || 'None'],
                    ['Experience', `${viewing.experience} years`],
                    ['Fee Per Trip', `₹${viewing.feePerTrip}`],
                    ['Rating', `⭐ ${viewing.rating} / 5.0`],
                  ]
                : []),
            ]}
          />
        </AdminDialog>
      )}

      {/* Create / Edit User Dialog */}
      {editing && (
        <AdminDialog
          title={editing.id ? `Edit ${editing.role}: ${editing.name}` : `Register New ${form.role}`}
          onClose={() => setEditing(null)}
          busy={resource.busy}
        >
          <form onSubmit={save}>
            {!editing.id && (
              <SelectField
                label="User Role"
                name="role"
                values={['Guide', 'Traveler']}
                value={form.role}
                onChange={change}
                disabled={resource.busy}
              />
            )}

            <Field
              label="Full Name"
              name="name"
              value={form.name}
              onChange={change}
              required
              disabled={resource.busy}
            />

            <Field
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={change}
              required
              disabled={resource.busy}
            />

            <Field
              label={form.role === 'Guide' ? 'Contact Phone' : 'Phone'}
              name="phone"
              value={form.phone}
              onChange={change}
              required
              disabled={resource.busy}
            />

            {!editing.id && (
              <Field
                label="Account Password"
                name="password"
                type="password"
                placeholder="Min 6 characters"
                minLength="6"
                value={form.password}
                onChange={change}
                required
                disabled={resource.busy}
              />
            )}

            {form.role === 'Guide' && (
              <>
                <Field
                  label="Languages Spoken (comma separated)"
                  name="languages"
                  placeholder="e.g. English, Hindi, Spanish"
                  value={form.languages}
                  onChange={change}
                  disabled={resource.busy}
                />
                <Field
                  label="Experience (Years)"
                  name="experience"
                  type="number"
                  min="0"
                  value={form.experience}
                  onChange={change}
                  disabled={resource.busy}
                />
                <Field
                  label="Fee Per Trip (₹)"
                  name="feePerTrip"
                  type="number"
                  min="0"
                  value={form.feePerTrip}
                  onChange={change}
                  disabled={resource.busy}
                />
              </>
            )}

            <SelectField
              label="Account Status"
              name="status"
              values={['Active', 'Inactive']}
              value={form.status}
              onChange={change}
              disabled={resource.busy}
            />

            {resource.error && (
              <p className="admin-error" role="alert">
                {resource.error}
              </p>
            )}

            <FormActions busy={resource.busy} onCancel={() => setEditing(null)} />
          </form>
        </AdminDialog>
      )}

      {/* Delete User Confirmation */}
      {deleting && (
        <DeleteDialog
          title={`Delete ${deleting.role} ${deleting.name}?`}
          warning={`This permanently removes account #${deleting.id} (${deleting.email}). Associated trips, messages, or historical references may still persist.`}
          busy={resource.busy}
          error={resource.error}
          onClose={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </AdminPage>
  );
}
