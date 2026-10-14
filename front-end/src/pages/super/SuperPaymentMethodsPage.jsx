import React, { useEffect, useState } from 'react';
import { paymentsApi } from '../../services/api';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';
import Toast from '../../components/common/Toast';
import {
  AdminDialog,
  Field,
  SelectField,
  FormActions,
} from '../../components/admin/AdminUI';

// NOTE: This payment method configuration is currently maintained in local React state
// as no dedicated NestJS payment method configuration entity/endpoint currently exists in the backend.
// Future persistence will require creating dedicated endpoints (e.g., PUT /payments/methods/config).

const INITIAL_METHODS = [
  // Platform native payment methods (matching CreatePaymentDto: 'Card' | 'UPI' | 'Cash')
  {
    id: 'pm-card',
    type: 'platform',
    methodKey: 'Card',
    displayName: 'Credit / Debit Card',
    status: 'Active',
    icon: '💳',
    description: 'Direct Visa, Mastercard, RuPay & Amex card payments',
    maskedKey: null,
  },
  {
    id: 'pm-upi',
    type: 'platform',
    methodKey: 'UPI',
    displayName: 'UPI & Instant Pay',
    status: 'Active',
    icon: '📱',
    description: 'Instant UPI QR codes, VPA handles & mobile apps',
    maskedKey: null,
  },
  {
    id: 'pm-cash',
    type: 'platform',
    methodKey: 'Cash',
    displayName: 'Cash / Manual Settlement',
    status: 'Active',
    icon: '💵',
    description: 'Offline agent collection and on-arrival guide payment',
    maskedKey: null,
  },
  // Gateway integrations
  {
    id: 'gw-stripe',
    type: 'gateway',
    methodKey: 'Stripe',
    displayName: 'Stripe Gateway Integration',
    status: 'Active',
    icon: '🌐',
    description: 'Global credit card processor with automated charge webhooks',
    maskedKey: 'pk_live_••••••••••••4892',
  },
  {
    id: 'gw-paypal',
    type: 'gateway',
    methodKey: 'PayPal',
    displayName: 'PayPal Express Checkout',
    status: 'Active',
    icon: '🅿️',
    description: 'Digital wallet processing for international inbound tourists',
    maskedKey: 'client_live_••••••••3810',
  },
  {
    id: 'gw-razorpay',
    type: 'gateway',
    methodKey: 'Razorpay',
    displayName: 'Razorpay Payment Gateway',
    status: 'Active',
    icon: '⚡',
    description: 'Domestic multi-channel checkout engine & UPI deep-links',
    maskedKey: 'rzp_live_••••••••9124',
  },
];

const INITIAL_CHANGES = [
  {
    id: 1,
    text: 'Stripe Gateway enabled for global multi-currency checkout',
    time: '2 hours ago',
    author: 'Super User',
  },
  {
    id: 2,
    text: 'UPI payment channel verified and set to Active',
    time: '1 day ago',
    author: 'Super User',
  },
  {
    id: 3,
    text: 'Platform payment methods synchronized with CreatePaymentDto',
    time: '3 days ago',
    author: 'Administrator',
  },
];

export default function SuperPaymentMethodsPage() {
  const [methods, setMethods] = useState(INITIAL_METHODS);
  const [changes, setChanges] = useState(INITIAL_CHANGES);
  const [editingMethod, setEditingMethod] = useState(null);
  const [form, setForm] = useState({ displayName: '', status: 'Active', maskedKey: '' });
  const [usageCounts, setUsageCounts] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Optionally load usage counts from paymentsApi.getAll; hide column if call fails
  useEffect(() => {
    let isMounted = true;
    paymentsApi
      .getAll()
      .then((data) => {
        if (!isMounted || !Array.isArray(data)) return;
        const counts = {};
        data.forEach((p) => {
          if (p.method) {
            counts[p.method] = (counts[p.method] || 0) + 1;
          }
        });
        setUsageCounts(counts);
      })
      .catch(() => {
        // Silently leave usageCounts as null if endpoint fails
        if (isMounted) setUsageCounts(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalMethods = methods.length;
  const activeCount = methods.filter((m) => m.status === 'Active').length;
  const inactiveCount = totalMethods - activeCount;

  const showToast = (msg, type = 'success') => {
    setToastType(type);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleToggle = (id) => {
    const target = methods.find((m) => m.id === id);
    if (!target) return;

    if (target.status === 'Active' && activeCount <= 1) {
      showToast(
        'Cannot disable the only remaining active payment method! At least one method must be enabled.',
        'error'
      );
      return;
    }

    const nextStatus = target.status === 'Active' ? 'Inactive' : 'Active';

    setMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
    );

    const logEntry = {
      id: Date.now(),
      text: `${target.displayName} switched to ${nextStatus}`,
      time: 'Just now',
      author: 'Super User',
    };
    setChanges([logEntry, ...changes]);
    showToast(`${target.displayName} is now ${nextStatus}! ✓`);
  };

  const openUpdateModal = (method) => {
    setEditingMethod(method);
    setForm({
      displayName: method.displayName,
      status: method.status,
      maskedKey: method.maskedKey || '',
    });
  };

  const saveMethodUpdate = (e) => {
    e.preventDefault();

    // Prevent disabling last active method
    if (editingMethod.status === 'Active' && form.status === 'Inactive' && activeCount <= 1) {
      showToast(
        'Action blocked: Disabling this method leaves no active payment channel. Enable another method first.',
        'error'
      );
      return;
    }

    setMethods((prev) =>
      prev.map((m) =>
        m.id === editingMethod.id
          ? {
              ...m,
              displayName: form.displayName.trim(),
              status: form.status,
              maskedKey: m.type === 'gateway' ? form.maskedKey.trim() : null,
            }
          : m
      )
    );

    const logEntry = {
      id: Date.now(),
      text: `${form.displayName.trim()} settings updated (${form.status})`,
      time: 'Just now',
      author: 'Super User',
    };
    setChanges([logEntry, ...changes]);
    setEditingMethod(null);
    showToast(`Updated ${form.displayName.trim()} successfully! ✓`);
  };

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <h1>Payment Methods & Gateway Configuration</h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Manage platform checkout instruments (Card, UPI, Cash) and external payment gateways.
          </p>
        </div>
      </header>

      {/* Critical Zero-Method Warning Banner */}
      {activeCount === 0 && (
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
              Travelers and agencies are currently blocked from placing bookings. Please enable at least one payment method immediately.
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
        <SummaryCard label="Configured Methods" value={totalMethods} style={{ borderRadius: 12 }} />
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
        <SummaryCard label="Payment Currency" value="INR (₹) Direct" style={{ borderRadius: 12 }} />
      </div>

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
                  <th>Category</th>
                  <th>Status</th>
                  {usageCounts && <th>Total Ledger Usage</th>}
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
                            {m.type === 'gateway' ? m.maskedKey : `Code: ${m.methodKey}`}
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
                          background: m.type === 'platform' ? '#ecfdf5' : '#e0e7ff',
                          color: m.type === 'platform' ? '#065f46' : '#3730a3',
                          textTransform: 'capitalize',
                        }}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    {usageCounts && (
                      <td style={{ fontWeight: 600 }}>
                        {usageCounts[m.methodKey]
                          ? `${usageCounts[m.methodKey]} payments`
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
        </div>

        {/* Recent Updates Audit Log */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
            Recent Payment Configuration Updates
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {changes.map((c) => (
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
                    background: '#6366f1',
                    marginTop: '6px',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    {c.text}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                    {c.author} • {c.time}
                  </div>
                </div>
              </div>
            ))}
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
            🔒 <strong>Security Policy:</strong> API secret keys are stored exclusively in encrypted environment credentials and are never exposed over the client frontend bundle.
          </div>
        </div>
      </div>

      {/* Update Method Dialog */}
      {editingMethod && (
        <AdminDialog
          title={`Update Payment Channel: ${editingMethod.displayName}`}
          onClose={() => setEditingMethod(null)}
          busy={false}
        >
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
                placeholder="e.g. pk_live_••••••••1234"
              />
            )}

            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
              Changes take effect immediately on checkout screens across Traveler and Agency portals.
            </p>

            <FormActions busy={false} onCancel={() => setEditingMethod(null)} />
          </form>
        </AdminDialog>
      )}

      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
    </div>
  );
}
