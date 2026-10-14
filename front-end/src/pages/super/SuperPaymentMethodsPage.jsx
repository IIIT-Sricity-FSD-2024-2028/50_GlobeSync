import React, { useEffect, useState } from 'react';
import { paymentsApi, systemConfigApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';
import Toast from '../../components/common/Toast';
import {
  AdminDialog,
  Field,
  SelectField,
  FormActions,
} from '../../components/admin/AdminUI';

export default function SuperPaymentMethodsPage() {
  const [methods, setMethods] = useState([]);
  const [changes, setChanges] = useState([]);
  const [editingMethod, setEditingMethod] = useState(null);
  const [form, setForm] = useState({ displayName: '', status: 'Active', maskedKey: '' });
  const [modalError, setModalError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [usageCounts, setUsageCounts] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastType(type);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [pmData, auditData, paymentsData] = await Promise.all([
        systemConfigApi.getPaymentMethods(),
        systemConfigApi.getAuditLogs(),
        paymentsApi.getAll().catch(() => null),
      ]);

      if (Array.isArray(pmData)) {
        setMethods(pmData);
      }
      if (Array.isArray(auditData)) {
        setChanges(auditData);
      }
      if (Array.isArray(paymentsData)) {
        const counts = {};
        paymentsData.forEach((p) => {
          if (p.method) {
            counts[p.method] = (counts[p.method] || 0) + 1;
          }
        });
        setUsageCounts(counts);
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load payment methods from backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalMethods = methods.length;
  const activeCount = methods.filter((m) => m.status === 'Active').length;
  const inactiveCount = totalMethods - activeCount;

  const handleToggle = async (id) => {
    const target = methods.find((m) => m.id === id);
    if (!target) return;

    const nextStatus = target.status === 'Active' ? 'Inactive' : 'Active';

    try {
      const updated = await systemConfigApi.updatePaymentMethod(id, { status: nextStatus });
      setMethods((prev) => prev.map((m) => (m.id === id ? updated : m)));

      // Refresh audit logs
      const freshLogs = await systemConfigApi.getAuditLogs();
      if (Array.isArray(freshLogs)) {
        setChanges(freshLogs);
      }

      showToast(`${updated.displayName} is now ${updated.status}! ✓`);
    } catch (err) {
      showToast(err.message || 'Failed to update payment method status', 'error');
    }
  };

  const openUpdateModal = (method) => {
    setEditingMethod(method);
    setModalError(null);
    setForm({
      displayName: method.displayName,
      status: method.status,
      maskedKey: method.maskedKey || '',
    });
  };

  const saveMethodUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      const updated = await systemConfigApi.updatePaymentMethod(editingMethod.id, {
        displayName: form.displayName.trim(),
        status: form.status,
        maskedKey: editingMethod.type === 'gateway' ? form.maskedKey.trim() : null,
      });

      setMethods((prev) => prev.map((m) => (m.id === editingMethod.id ? updated : m)));

      // Refresh audit logs
      const freshLogs = await systemConfigApi.getAuditLogs();
      if (Array.isArray(freshLogs)) {
        setChanges(freshLogs);
      }

      setEditingMethod(null);
      showToast(`Updated ${updated.displayName} successfully! ✓`);
    } catch (err) {
      setModalError(err.message || 'Failed to save payment channel update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <h1>Payment Methods & Gateway Configuration</h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Manage platform checkout instruments (Card, UPI, Cash) and external gateway connectors.
          </p>
        </div>
      </header>

      {/* Critical Load Error Banner */}
      {loadError && (
        <div
          role="alert"
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            background: '#fee2e2',
            border: '2px solid #ef4444',
            color: '#991b1b',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <div>Failed to load payment configuration from backend</div>
            <div style={{ fontSize: '13px', fontWeight: 400, marginTop: '2px' }}>{loadError}</div>
          </div>
        </div>
      )}

      {/* Critical Zero-Method Warning Banner */}
      {!isLoading && activeCount === 0 && (
        <div
          role="alert"
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            background: '#fee2e2',
            border: '2px solid #ef4444',
            color: '#991b1b',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: '24px' }}>🚨</span>
          <div>
            <div>CRITICAL WARNING: No payment method is currently enabled!</div>
            <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '2px' }}>
              Travelers and agencies are currently blocked from completing payments. Please enable at least one payment method immediately.
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard label="Configured Channels" value={totalMethods} style={{ borderRadius: 12 }} />
        <SummaryCard
          label="Active Channels"
          value={<span style={{ color: '#059669', fontWeight: 800 }}>{activeCount}</span>}
          style={{ borderRadius: 12 }}
        />
        <SummaryCard
          label="Disabled / Inactive"
          value={<span style={{ color: inactiveCount > 0 ? '#d97706' : '#6b7280' }}>{inactiveCount}</span>}
          style={{ borderRadius: 12 }}
        />
        <SummaryCard label="Primary Currency" value="INR (₹) Direct" style={{ borderRadius: 12 }} />
      </div>

      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <div className="admin-spinner" style={{ margin: '0 auto 12px' }} />
          Loading payment configurations from backend...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px',
            marginBottom: '24px',
          }}
        >
          {/* Payment Methods Table */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
              Available Checkout Channels
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Classification</th>
                    <th>Status</th>
                    {usageCounts && <th>Total Ledger Payments</th>}
                    <th>Quick Toggle</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {methods.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '20px' }}>{m.icon}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.displayName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              {m.type === 'gateway' ? m.maskedKey || 'Connector Demo' : `System Code: ${m.methodKey}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: m.type === 'platform' ? '#ecfdf5' : '#fef3c7',
                            color: m.type === 'platform' ? '#065f46' : '#92400e',
                          }}
                        >
                          {m.type === 'platform' ? 'Platform Native' : 'Gateway (Demo)'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={m.status} />
                      </td>
                      {usageCounts && (
                        <td style={{ fontWeight: 600 }}>
                          {usageCounts[m.methodKey]
                            ? `${usageCounts[m.methodKey]} recorded`
                            : '-'}
                        </td>
                      )}
                      <td>
                        <input
                          type="checkbox"
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          checked={m.status === 'Active'}
                          onChange={() => handleToggle(m.id)}
                          aria-label={`Toggle ${m.displayName}`}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openUpdateModal(m)}
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: '16px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                color: 'var(--muted)',
                lineHeight: 1.4,
              }}
            >
              ℹ️ <strong>Ledger Integration:</strong> Disabling a platform native payment channel (e.g. UPI or Cash) immediately removes it from traveler checkout forms and rejects direct API payments with that instrument.
            </div>
          </div>

          {/* Recent Updates Audit Log */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
              Recent Payment Configuration Updates
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              {changes.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '13px', fontStyle: 'italic', padding: '12px 0' }}>
                  No configuration updates logged yet.
                </div>
              ) : (
                changes.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 0',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: c.color || '#6366f1',
                        marginTop: '6px',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {c.text}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                        {c.author} • {c.time || (c.timestamp ? new Date(c.timestamp).toLocaleString() : 'Recent')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                marginTop: '20px',
                padding: '12px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                color: 'var(--muted)',
              }}
            >
              🔒 <strong>Security Policy:</strong> API secret keys are maintained strictly in environment-isolated storage and are never returned to client bundles.
            </div>
          </div>
        </div>
      )}

      {/* Update Method Dialog */}
      {editingMethod && (
        <AdminDialog
          title={`Update Payment Channel: ${editingMethod.displayName}`}
          onClose={() => setEditingMethod(null)}
          busy={isSubmitting}
        >
          {modalError && (
            <div
              className="feedback-banner error"
              style={{ marginBottom: '16px', padding: '10px 14px' }}
            >
              <span>⚠️ {modalError}</span>
            </div>
          )}

          <form onSubmit={saveMethodUpdate}>
            <Field
              label="Public Display Name"
              value={form.displayName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, displayName: e.target.value }))
              }
              required
            />

            <SelectField
              label="Availability Status"
              name="status"
              values={['Active', 'Inactive']}
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, status: e.target.value }))
              }
            />

            {editingMethod.type === 'gateway' && (
              <Field
                label="Masked Gateway Key Identifier (Label only — never enter raw secrets)"
                value={form.maskedKey}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, maskedKey: e.target.value }))
                }
                placeholder="e.g. pk_test_••••••••1234"
              />
            )}

            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
              Changes take effect immediately on checkout screens across Traveler and Agency portals.
            </p>

            <FormActions busy={isSubmitting} onCancel={() => setEditingMethod(null)} />
          </form>
        </AdminDialog>
      )}

      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
    </div>
  );
}
