import React, { useState } from 'react';
import Toast from '../../components/common/Toast';

const INITIAL_RULES = {
  autoConfirm: true,
  allowCancel: true,
  bookingLimit: 500000,
  cancelCutoffHours: 48,
  refundDeductionPct: 10,
  stripeGateway: true,
  paypalGateway: true,
  razorpayGateway: true,
  emailNotifications: true,
  smsAlerts: false,
};

const INITIAL_CHANGES = [
  {
    id: 1,
    text: 'Stripe payment gateway enabled in production',
    author: 'Super User',
    time: '1 day ago',
    color: '#10b981',
  },
  {
    id: 2,
    text: 'Cancellation cutoff window updated to 48 hours',
    author: 'Super User',
    time: '2 days ago',
    color: '#6366f1',
  },
  {
    id: 3,
    text: 'Global transaction ceiling set to ₹5,00,000',
    author: 'Administrator',
    time: '4 days ago',
    color: '#f59e0b',
  },
];

export default function SuperRulesConfigPage() {
  const [rules, setRules] = useState(INITIAL_RULES);
  const [changes, setChanges] = useState(INITIAL_CHANGES);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const handleToggle = (key) => {
    setRules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRules((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();

    const newChangeEntry = {
      id: Date.now(),
      text: `Rules configuration saved — Limit set to ₹${Number(rules.bookingLimit).toLocaleString('en-IN')}, cancellation cutoff at ${rules.cancelCutoffHours}h`,
      author: 'Super User',
      time: 'Just now',
      color: '#10b981',
    };

    setChanges([newChangeEntry, ...changes]);
    setToastType('success');
    setToastMessage('Rules configuration saved successfully! ✓');
    setTimeout(() => setToastMessage(''), 3500);
  };

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <h1>Global Rules & Platform Policy Configuration</h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Configure real-time booking thresholds, automated confirmation triggers, and gateway switches.
          </p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            style={{ minWidth: '140px' }}
          >
            Save All Changes
          </button>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
          marginTop: '20px',
        }}
      >
        {/* Left Column: Rules & Policies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Booking Rules Card */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> Booking & Itinerary Confirmation Rules
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-light, #e2e8f0)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Auto-Confirm Bookings</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Automatically transition payments to Confirmed status upon transaction success
                  </div>
                </div>
                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  checked={rules.autoConfirm}
                  onChange={() => handleToggle('autoConfirm')}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-light, #e2e8f0)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Allow Traveler Cancellations</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Enable travelers to submit self-serve refund & cancellation requests
                  </div>
                </div>
                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  checked={rules.allowCancel}
                  onChange={() => handleToggle('allowCancel')}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Maximum Single Booking Ceiling (₹)
                </label>
                <input
                  className="form-control"
                  type="number"
                  name="bookingLimit"
                  value={rules.bookingLimit}
                  onChange={handleChange}
                  min="10000"
                  step="5000"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                  Transactions exceeding ₹{Number(rules.bookingLimit).toLocaleString('en-IN')} require manual approval.
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy Card */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⏳</span> Cancellation & Refund Window
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Cutoff Window Prior to Departure (Hours)
                </label>
                <select
                  className="form-control"
                  name="cancelCutoffHours"
                  value={rules.cancelCutoffHours}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours</option>
                  <option value={48}>48 Hours</option>
                  <option value={72}>72 Hours</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Standard Platform Refund Processing Fee (%)
                </label>
                <input
                  className="form-control"
                  type="number"
                  name="refundDeductionPct"
                  value={rules.refundDeductionPct}
                  onChange={handleChange}
                  min="0"
                  max="50"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Gateways & Audit History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Gateway & Dispatch Toggles */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔌</span> Payment & Notification Channels
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>💳 Stripe Gateway</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Global credit and debit cards</div>
                </div>
                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  checked={rules.stripeGateway}
                  onChange={() => handleToggle('stripeGateway')}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>🅿️ PayPal Checkout</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Cross-border digital wallet payments</div>
                </div>
                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  checked={rules.paypalGateway}
                  onChange={() => handleToggle('paypalGateway')}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>📱 Razorpay UPI / NetBanking</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Domestic instant UPI payments</div>
                </div>
                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  checked={rules.razorpayGateway}
                  onChange={() => handleToggle('razorpayGateway')}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-light, #e2e8f0)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>✉️ Email Alerts Dispatch</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Transactional invoices and trip confirmations</div>
                </div>
                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  checked={rules.emailNotifications}
                  onChange={() => handleToggle('emailNotifications')}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>📲 SMS Itinerary Alerts</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Critical departure notifications via SMS</div>
                </div>
                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  checked={rules.smsAlerts}
                  onChange={() => handleToggle('smsAlerts')}
                />
              </div>
            </div>
          </div>

          {/* Recent Policy Audit Trail */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📜</span> Policy Change Audit Log
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
                      background: c.color,
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
          </div>
        </div>
      </div>

      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage('')}
      />
    </div>
  );
}
