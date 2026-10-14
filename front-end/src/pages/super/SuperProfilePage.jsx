import React, { useCallback, useEffect, useState } from 'react';
import { adminsApi } from '../../services/api';
import { useSession } from '../../context/SessionContext';
import {
  AdminPage,
  Details,
  Field,
  useAdminData,
} from '../../components/admin/AdminUI';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * SuperProfilePage
 * Primary route: /super/profile
 *
 * Manages master superuser identity credentials.
 * In accordance with backend UpdateAdminDto, only name and email may be modified.
 * Unsupported password modification has been removed to align with backend capabilities.
 */
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
  const [form, setForm] = useState({ name: '', email: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (resource.data) {
      setForm({
        name: resource.data.name || '',
        email: resource.data.email || '',
      });
      setFieldErrors({});
    }
  }, [resource.data]);

  const handleChange = (e) => {
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

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) {
      errors.name = 'Full administrative name is required.';
    } else if (form.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!form.email.trim()) {
      errors.email = 'Primary email address is required.';
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
    };

    resource.run(
      () => adminsApi.update(id, payload),
      'Superuser profile credentials updated successfully! ✅',
      (updated) => {
        updateUser(updated || payload);
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
          {/* Identity Card */}
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
              Modify your administrative display identity and communication email address.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <Field
                id="super-name"
                label="Full Administrative Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                disabled={resource.busy}
                error={fieldErrors.name}
                autoComplete="name"
                helperText="Official display name for administrative logging."
              />

              <Field
                id="super-email"
                label="Primary Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                disabled={resource.busy}
                error={fieldErrors.email}
                autoComplete="email"
                helperText="Primary email used for alerts and escalation notices."
              />

              <div
                className="admin-status-note"
                style={{
                  backgroundColor: '#f8fafc',
                  borderLeft: '4px solid #6366f1',
                  fontSize: '0.85rem',
                  color: '#475569',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                }}
              >
                <strong>Security Policy:</strong> In compliance with the backend security policy,
                administrative accounts support name and email updates. Password changes must be
                provisioned directly through secure server infrastructure.
              </div>

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
