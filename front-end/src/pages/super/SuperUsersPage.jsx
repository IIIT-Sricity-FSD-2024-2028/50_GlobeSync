import React, { useState, useMemo } from 'react';
import { travelersApi, guidesApi, superUsersApi, getStoredUserId } from '../../services/api';
import {
  AdminPage,
  AdminTable,
  AdminDialog,
  Field,
  SelectField,
  FormActions,
  DeleteDialog,
  Details,
  matches,
  money,
  useAdminData,
} from '../../components/admin/AdminUI';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+0-9\s\-()]{7,20}$/;

const loadUsers = async (options) => {
  const [travelers, guides, supportUsers, adminsList] = await Promise.all([
    travelersApi.getAll(options),
    guidesApi.getAll(options),
    superUsersApi.getSupportUsers(options),
    superUsersApi.getAdmins(options),
  ]);

  const tList = (Array.isArray(travelers) ? travelers : []).map((t) => ({
    id: `T${t.travelerId}`,
    numericId: t.travelerId,
    role: 'Traveler',
    name: t.name,
    email: t.email,
    phone: t.phone || 'N/A',
    gender: t.gender || 'N/A',
    age: t.age != null ? t.age : 'N/A',
    raw: t,
  }));

  const gList = (Array.isArray(guides) ? guides : []).map((g) => ({
    id: `G${g.guideId}`,
    numericId: g.guideId,
    role: 'Guide',
    name: g.name,
    email: g.email || 'N/A',
    phone: g.contact || 'N/A',
    languages: Array.isArray(g.languages) ? g.languages.join(', ') : g.languages || '',
    experience: g.experience ?? 0,
    pricePerTrip: g.pricePerTrip ?? 0,
    rating: g.rating ?? 5.0,
    raw: g,
  }));

  const sList = (Array.isArray(supportUsers) ? supportUsers : []).map((s) => ({
    id: `S${s.careId}`,
    numericId: s.careId,
    role: 'Support Staff',
    name: s.name,
    email: s.email,
    phone: s.contact || 'N/A',
    raw: s,
  }));

  const aList = (Array.isArray(adminsList) ? adminsList : []).map((a) => ({
    id: `A${a.adminId}`,
    numericId: a.adminId,
    role: a.role === 'superuser' ? 'Superuser' : 'Administrator',
    adminRole: a.role,
    name: a.name,
    email: a.email,
    phone: 'Internal Staff',
    raw: a,
  }));

  return [...tList, ...gList, ...sList, ...aList];
};

const blankUser = {
  role: 'Guide',
  adminRole: 'admin',
  name: '',
  email: '',
  phone: '',
  password: '',
  languages: 'English',
  experience: '2',
  pricePerTrip: '5000',
  gender: 'Male',
  age: '28',
};

/**
 * SuperUsersPage
 * Primary route: /super/users
 *
 * Full-System User Directory managing all platform roles:
 * - Travelers (Customer accounts)
 * - Tour Guides (Field leadership)
 * - Customer Support Staff (Care portal agents)
 * - Platform Administrators & Superusers
 */
export default function SuperUsersPage() {
  const resource = useAdminData(loadUsers);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankUser);
  const [fieldErrors, setFieldErrors] = useState({});

  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [actionError, setActionError] = useState(null);

  const change = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const openCreate = (defaultRole = 'Guide') => {
    setEditing({});
    setActionError(null);
    setForm({ ...blankUser, role: defaultRole });
    setFieldErrors({});
  };

  const openEdit = (user) => {
    setEditing(user);
    setActionError(null);
    setForm({
      role: user.role,
      adminRole: user.adminRole || 'admin',
      name: user.name || '',
      email: user.email === 'N/A' ? '' : user.email,
      phone: user.phone === 'N/A' || user.phone === 'Internal Staff' ? '' : user.phone,
      password: '',
      languages: user.languages || '',
      experience: String(user.experience ?? 0),
      pricePerTrip: String(user.pricePerTrip ?? 0),
      gender: user.gender !== 'N/A' ? user.gender : 'Male',
      age: user.age !== 'N/A' ? String(user.age) : '25',
    });
    setFieldErrors({});
  };

  const allUsers = resource.data || [];

  const rows = useMemo(() => {
    return allUsers.filter((u) => {
      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesQuery = matches([u.id, u.name, u.email, u.phone, u.role], query);
      return matchesRole && matchesQuery;
    });
  }, [allUsers, roleFilter, query]);

  const validate = () => {
    const errors = {};
    const isNew = !editing?.id;

    if (!form.name.trim()) {
      errors.name = 'Full name is required.';
    } else if (form.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!form.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    } else {
      const isDuplicate = allUsers.some(
        (u) =>
          u.email.toLowerCase() === form.email.trim().toLowerCase() &&
          u.id !== editing?.id
      );
      if (isDuplicate) {
        errors.email = 'This email address is already registered.';
      }
    }

    if (form.role !== 'Administrator' && form.role !== 'Superuser') {
      if (!form.phone.trim()) {
        errors.phone = 'Phone / contact number is required.';
      } else if (!PHONE_REGEX.test(form.phone.trim())) {
        errors.phone = 'Please enter a valid phone number (7-20 digits).';
      }
    }

    if (isNew) {
      if (!form.password) {
        errors.password = 'Initial account password is required.';
      } else if (form.password.length < 4) {
        errors.password = 'Password must be at least 4 characters.';
      }
    }

    if (form.role === 'Guide') {
      const exp = Number(form.experience);
      if (form.experience.trim() === '' || Number.isNaN(exp) || exp < 0) {
        errors.experience = 'Experience must be 0 or greater.';
      }

      const price = Number(form.pricePerTrip);
      if (form.pricePerTrip.trim() === '' || Number.isNaN(price) || price < 0) {
        errors.pricePerTrip = 'Price per trip must be 0 or greater (valid zero preserved).';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const isNew = !editing.id;

    if (isNew) {
      if (form.role === 'Guide') {
        const languagesList = form.languages
          ? form.languages.split(',').map((s) => s.trim()).filter(Boolean)
          : ['English'];

        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          contact: form.phone.trim(),
          languages: languagesList.length > 0 ? languagesList : ['English'],
          experience: Number(form.experience),
          pricePerTrip: Number(form.pricePerTrip),
        };

        resource.run(
          () => guidesApi.create(payload),
          'New Tour Guide registered successfully!',
          () => setEditing(null)
        );
      } else if (form.role === 'Support Staff') {
        const payload = {
          name: form.name.trim(),
          contact: form.phone.trim(),
          email: form.email.trim(),
          password: form.password,
        };

        resource.run(
          () => superUsersApi.createSupportUser(payload),
          'Customer Support staff account created successfully!',
          () => setEditing(null)
        );
      } else if (form.role === 'Administrator') {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.adminRole === 'superuser' ? 'superuser' : 'admin',
        };

        resource.run(
          () => superUsersApi.createAdmin(payload),
          `New ${payload.role === 'superuser' ? 'Superuser' : 'Administrator'} account created successfully!`,
          () => setEditing(null)
        );
      } else {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim(),
          gender: form.gender || 'Not specified',
          age: form.age ? Number(form.age) : 25,
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
        const languagesList = form.languages
          ? form.languages.split(',').map((s) => s.trim()).filter(Boolean)
          : ['English'];

        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          contact: form.phone.trim(),
          languages: languagesList.length > 0 ? languagesList : ['English'],
          experience: Number(form.experience),
          pricePerTrip: Number(form.pricePerTrip),
        };

        resource.run(
          () => guidesApi.update(editing.numericId, payload),
          'Guide details updated.',
          () => setEditing(null)
        );
      } else if (editing.role === 'Traveler') {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          gender: form.gender,
          age: form.age ? Number(form.age) : undefined,
        };

        resource.run(
          () => travelersApi.update(editing.numericId, payload),
          'Traveler details updated.',
          () => setEditing(null)
        );
      } else {
        // Staff profiles edited via profile endpoint
        resource.setError('Self-profile endpoints protect staff accounts from direct attribute tampering.');
      }
    }
  };

  const initiateDelete = (user) => {
    setActionError(null);
    const currentUserId = getStoredUserId();

    if ((user.role === 'Administrator' || user.role === 'Superuser') && String(user.numericId) === String(currentUserId)) {
      setActionError('Action blocked: Cannot delete your own active administrator account.');
      return;
    }

    setDeleting(user);
  };

  const confirmDelete = () => {
    if (!deleting) return;

    if (deleting.role === 'Guide') {
      resource.run(
        () => guidesApi.delete(deleting.numericId),
        `Guide ${deleting.name} (#${deleting.id}) deleted.`,
        () => setDeleting(null)
      );
    } else if (deleting.role === 'Support Staff') {
      resource.run(
        () => superUsersApi.deleteSupportUser(deleting.numericId),
        `Support staff ${deleting.name} (#${deleting.id}) deleted.`,
        () => setDeleting(null)
      );
    } else if (deleting.role === 'Administrator' || deleting.role === 'Superuser') {
      resource.run(
        () => superUsersApi.deleteAdmin(deleting.numericId),
        `${deleting.role} ${deleting.name} (#${deleting.id}) removed.`,
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

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'Guide':
        return { background: '#e0e7ff', color: '#3730a3' };
      case 'Support Staff':
        return { background: '#fef3c7', color: '#92400e' };
      case 'Administrator':
        return { background: '#f3e8ff', color: '#6b21a8' };
      case 'Superuser':
        return { background: '#fee2e2', color: '#991b1b' };
      case 'Traveler':
      default:
        return { background: '#ecfdf5', color: '#065f46' };
    }
  };

  return (
    <AdminPage
      title="Global User Accounts Directory"
      resource={resource}
      actions={
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
            onClick={() => openCreate('Support Staff')}
          >
            + Add Support Staff
          </button>
          <button
            className="btn btn-secondary"
            disabled={resource.busy}
            onClick={() => openCreate('Administrator')}
          >
            + Add Admin
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
      {actionError && (
        <div
          className="feedback-banner error"
          style={{ marginBottom: '16px', padding: '12px 16px' }}
        >
          <span>⚠️ {actionError}</span>
          <button
            type="button"
            className="feedback-banner-close"
            onClick={() => setActionError(null)}
          >
            ✕
          </button>
        </div>
      )}

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
              Filter Role
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="Traveler">Travelers</option>
                <option value="Guide">Tour Guides</option>
                <option value="Support Staff">Customer Care Support</option>
                <option value="Administrator">Administrators</option>
                <option value="Superuser">Superusers</option>
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
                      ...getRoleBadgeStyle(u.role),
                    }}
                  >
                    {u.role}
                  </span>
                ),
              },
              { label: 'Email', key: 'email' },
              { label: 'Contact', key: 'phone' },
              {
                label: 'Profile Summary',
                render: (u) => {
                  if (u.role === 'Guide') {
                    return (
                      <span style={{ fontSize: '0.85rem' }}>
                        {u.experience} yrs exp &bull; {money(u.pricePerTrip)}/trip &bull; ★{' '}
                        {Number(u.rating).toFixed(1)}
                      </span>
                    );
                  }
                  if (u.role === 'Support Staff') {
                    return <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Care Helpdesk Agent</span>;
                  }
                  if (u.role === 'Administrator' || u.role === 'Superuser') {
                    return <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Platform Staff &bull; Full Access</span>;
                  }
                  return (
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {u.gender !== 'N/A' ? `${u.gender}` : ''}
                      {u.age !== 'N/A' ? ` &bull; Age: ${u.age}` : ''}
                    </span>
                  );
                },
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
                    {(u.role === 'Guide' || u.role === 'Traveler') && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEdit(u)}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => initiateDelete(u)}
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
              ...(viewing.role === 'Guide'
                ? [
                    ['Languages', viewing.languages || 'English'],
                    ['Experience', `${viewing.experience} years`],
                    ['Price Per Trip', money(viewing.pricePerTrip)],
                    ['Rating', `⭐ ${viewing.rating} / 5.0`],
                  ]
                : viewing.role === 'Support Staff'
                ? [
                    ['Portal Responsibility', 'Customer disputes & support tickets'],
                    ['Record Key', `careId #${viewing.numericId}`],
                  ]
                : viewing.role === 'Administrator' || viewing.role === 'Superuser'
                ? [
                    ['Access Level', viewing.role === 'Superuser' ? 'Superuser (Root Platform Owner)' : 'Standard Administrator'],
                    ['Account Key', `adminId #${viewing.numericId}`],
                  ]
                : [
                    ['Gender', viewing.gender || 'Not specified'],
                    ['Age', viewing.age !== 'N/A' ? viewing.age : 'Not specified'],
                  ]),
            ]}
          />
        </AdminDialog>
      )}

      {/* Create / Edit User Dialog */}
      {editing && (
        <AdminDialog
          title={
            editing.id
              ? `Edit ${editing.role}: ${editing.name}`
              : `Register New ${form.role}`
          }
          onClose={() => setEditing(null)}
          busy={resource.busy}
          error={resource.error}
        >
          <form onSubmit={save} noValidate>
            {!editing.id && (
              <SelectField
                id="super-user-role"
                label="Account Role Type"
                name="role"
                values={['Guide', 'Support Staff', 'Administrator', 'Traveler']}
                value={form.role}
                onChange={change}
                disabled={resource.busy}
              />
            )}

            {!editing.id && form.role === 'Administrator' && (
              <SelectField
                id="super-admin-level"
                label="Administrative Privilege Level"
                name="adminRole"
                values={['admin', 'superuser']}
                value={form.adminRole}
                onChange={change}
                disabled={resource.busy}
              />
            )}

            <Field
              id="super-user-name"
              label="Full Name"
              name="name"
              value={form.name}
              onChange={change}
              required
              disabled={resource.busy}
              error={fieldErrors.name}
            />

            <Field
              id="super-user-email"
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={change}
              required
              disabled={resource.busy}
              error={fieldErrors.email}
            />

            {(form.role !== 'Administrator' && form.role !== 'Superuser') && (
              <Field
                id="super-user-phone"
                label="Phone / Contact Number"
                name="phone"
                value={form.phone}
                onChange={change}
                required
                disabled={resource.busy}
                error={fieldErrors.phone}
              />
            )}

            {!editing.id && (
              <Field
                id="super-user-password"
                label="Initial Account Password"
                name="password"
                type="password"
                value={form.password}
                onChange={change}
                required
                disabled={resource.busy}
                error={fieldErrors.password}
              />
            )}

            {form.role === 'Guide' && (
              <>
                <Field
                  id="super-user-languages"
                  label="Spoken Languages (comma-separated)"
                  name="languages"
                  value={form.languages}
                  onChange={change}
                  disabled={resource.busy}
                />

                <Field
                  id="super-user-experience"
                  label="Years of Experience"
                  name="experience"
                  type="number"
                  value={form.experience}
                  onChange={change}
                  required
                  disabled={resource.busy}
                  error={fieldErrors.experience}
                />

                <Field
                  id="super-user-price-per-trip"
                  label="Price Per Trip (₹)"
                  name="pricePerTrip"
                  type="number"
                  value={form.pricePerTrip}
                  onChange={change}
                  required
                  disabled={resource.busy}
                  error={fieldErrors.pricePerTrip}
                />
              </>
            )}

            {form.role === 'Traveler' && (
              <>
                <SelectField
                  id="super-user-gender"
                  label="Gender"
                  name="gender"
                  values={['Male', 'Female', 'Other', 'Prefer not to say']}
                  value={form.gender}
                  onChange={change}
                  disabled={resource.busy}
                />

                <Field
                  id="super-user-age"
                  label="Age"
                  name="age"
                  type="number"
                  value={form.age}
                  onChange={change}
                  disabled={resource.busy}
                />
              </>
            )}

            <FormActions busy={resource.busy} onCancel={() => setEditing(null)} />
          </form>
        </AdminDialog>
      )}

      {/* Delete User Confirmation */}
      {deleting && (
        <DeleteDialog
          target={`user "${deleting.name}" (${deleting.role} #${deleting.id})`}
          busy={resource.busy}
          error={resource.error}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </AdminPage>
  );
}
