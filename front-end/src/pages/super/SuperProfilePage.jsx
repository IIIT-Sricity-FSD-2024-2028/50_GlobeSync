import React, { useCallback, useEffect, useState } from 'react';
import { adminsApi } from '../../services/api';
import { useSession } from '../../context/SessionContext';
import {
  AdminPage,
  Details,
  Field,
  useAdminData,
} from '../../components/admin/AdminUI';

export default function SuperProfilePage() {
  const { user, updateUser } = useSession();
  const id = user?.adminId ?? user?.admin_id ?? user?.id;

  const load = useCallback(
    (options) => {
      if (!id) {
        return Promise.reject(
          new Error('Active session does not contain a valid Superuser Admin ID.')
        );
      }
      return adminsApi.getById(id, options);
    },
    [id]
  );

  const resource = useAdminData(load);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    if (resource.data) {
      setForm({
        name: resource.data.name || '',
        email: resource.data.email || '',
        password: '',
      });
    }
  }, [resource.data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
    };
    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    resource.run(
      () => adminsApi.update(id, payload),
      'Superuser profile credentials updated successfully! ✅',
      (updated) => {
        updateUser(updated || payload);
        setForm((prev) => ({ ...prev, password: '' }));
      }
    );
  };

  const initial = (form.name || user?.name || 'S')[0]?.toUpperCase();

  return (
    <AdminPage title="Superuser Master Account Profile" resource={resource}>
      {resource.data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginTop: '16px',
            alignItems: 'start',
          }}
        >
          {/* Identity Card matching super/profile.html */}
          <div
            className="card"
            style={{
              padding: 0,
              borderRadius: '16px',
              overflow: 'hidden',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                height: '110px',
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
              }}
            />
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: '#fff',
                border: '4px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 800,
                color: '#6366f1',
                margin: '-42px auto 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              {initial}
            </div>

            <div style={{ padding: '0 24px 24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
                {form.name || resource.data.name}
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
                {form.email || resource.data.email}
              </div>
              <span
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #f5f3ff 0%, #ffeef5 100%)',
                  color: '#6366f1',
                  border: '1px solid #e0e7ff',
                  padding: '4px 14px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                👑 Superuser Root
              </span>

              <div
                style={{
                  marginTop: '20px',
                  textAlign: 'left',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '16px',
                }}
              >
                <Details
                  entries={[
                    ['Admin Identifier', `#${resource.data.adminId}`],
                    ['Role Level', resource.data.role],
                    ['Department', resource.data.department || 'Executive Operations'],
                    ['Account Status', 'Active (Root Verified)'],
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Credentials Edit Form */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              Update Master Credentials
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
              Modify your administrative display identity and master authentication password.
            </p>

            <form onSubmit={handleSubmit}>
              <Field
                label="Full Administrative Name"
                name="name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                pattern=".*\\S.*"
                disabled={resource.busy}
                autoComplete="name"
              />

              <Field
                label="Primary Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                required
                disabled={resource.busy}
                autoComplete="email"
              />

              <Field
                label="New Password (leave blank to keep current)"
                name="password"
                type="password"
                placeholder="Enter at least 6 characters"
                minLength="6"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                disabled={resource.busy}
                autoComplete="new-password"
              />

              {resource.error && (
                <p className="admin-error" role="alert" style={{ marginTop: '12px' }}>
                  {resource.error}
                </p>
              )}

              <div style={{ marginTop: '20px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resource.busy}
                  style={{ width: '100%', padding: '12px' }}
                >
                  {resource.busy ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
