import React, { useState, useEffect } from 'react';
import { systemConfigApi } from '../../services/api';
import Toast from '../../components/common/Toast';

export default function SuperRulesConfigPage() {
  const [rules, setRules] = useState({
    autoConfirm: true,
    allowCancel: true,
    bookingLimit: 500000,
    cancelCutoffHours: 48,
    refundDeductionPct: 10,
    stripeGateway: false,
    paypalGateway: false,
    razorpayGateway: false,
    emailNotifications: true,
    smsAlerts: false,
  });
  const [changes, setChanges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastType(type);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Load backend persisted rules & audit logs on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      systemConfigApi.getRules(),
      systemConfigApi.getAuditLogs(),
    ])
      .then(([rulesData, auditData]) => {
        if (!isMounted) return;
        if (rulesData && typeof rulesData === 'object') {
          setRules(rulesData);
        }
        if (Array.isArray(auditData)) {
          setChanges(auditData);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadError(err.message || 'Failed to load platform rules from backend');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = (key) => {
    setRules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setRules((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      autoConfirm: Boolean(rules.autoConfirm),
      allowCancel: Boolean(rules.allowCancel),
      bookingLimit: Number(rules.bookingLimit),
      cancelCutoffHours: Number(rules.cancelCutoffHours),
      refundDeductionPct: Number(rules.refundDeductionPct),
      stripeGateway: Boolean(rules.stripeGateway),
      paypalGateway: Boolean(rules.paypalGateway),
      razorpayGateway: Boolean(rules.razorpayGateway),
      emailNotifications: Boolean(rules.emailNotifications),
      smsAlerts: Boolean(rules.smsAlerts),
    };

    try {
      const updatedRules = await systemConfigApi.updateRules(payload);
      setRules(updatedRules);

      // Refresh real backend audit trail
      const freshLogs = await systemConfigApi.getAuditLogs();
      if (Array.isArray(freshLogs)) {
        setChanges(freshLogs);
      }

      showToast('Rules configuration saved and applied across platform! ✓', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save configuration to backend', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <h1>Global Rules & Platform Policy Configuration</h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Configure real-time booking thresholds, automated confirmation triggers, and cancellation rules.
          </p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isLoading || isSaving}
            style={{ minWidth: '140px' }}
          >
            {isSaving ? 'Saving to Backend...' : 'Save All Changes'}
          </button>
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
            margin: '20px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <div>Failed to load platform configuration from backend</div>
            <div style={{ fontSize: '13px', fontWeight: 400, marginTop: '2px' }}>{loadError}</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <div className="admin-spinner" style={{ margin: '0 auto 12px' }} />
          Loading platform rules from backend...
        </div>
      ) : (
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
                      Automatically transition bookings to Confirmed status upon successful payment creation
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
                    min="1000"
                    step="5000"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Transactions exceeding ₹{Number(rules.bookingLimit || 0).toLocaleString('en-IN')} are rejected by the payments ledger.
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
                    onChange={(e) => setRules((prev) => ({ ...prev, cancelCutoffHours: Number(e.target.value) }))}
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
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Deducted from gross refund amount upon claim approval (0% to 50%).
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Gateways & Audit History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Gateway & Dispatch Toggles */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔌</span> Channels & Demonstration Switches
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>💳 Stripe Gateway (Simulation Mode)</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Demonstration connector (unconnected sandbox)
                    </div>
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
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>🅿️ PayPal Express (Simulation Mode)</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Demonstration connector (unconnected sandbox)
                    </div>
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
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>📱 Razorpay Gateway (Simulation Mode)</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Demonstration connector (unconnected sandbox)
                    </div>
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

                <div
                  style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '11px',
                    color: 'var(--muted)',
                  }}
                >
                  ℹ️ <strong>Channel Notice:</strong> Native checkout channels (Card, UPI, Cash) process live platform ledger records in INR (₹). External gateway connectors operate in simulation mode.
                </div>
              </div>
            </div>

            {/* Recent Policy Audit Trail */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📜</span> Backend Policy Change Audit Trail
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
                {changes.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '13px', fontStyle: 'italic', padding: '12px 0' }}>
                    No audit records recorded yet.
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
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage('')}
      />
    </div>
  );
}
