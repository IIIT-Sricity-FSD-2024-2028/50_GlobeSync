import React, { useState, useEffect } from 'react';
import { systemConfigApi, healthApi } from '../../services/api';
import Toast from '../../components/common/Toast';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';

const CATEGORIES = [
  { id: 'all', label: 'All Services' },
  { id: 'core', label: '🚀 Core Engine' },
  { id: 'payment', label: '💳 Payment' },
  { id: 'travel', label: '✈ Travel & Booking' },
  { id: 'maps', label: '📍 Maps & Geo' },
  { id: 'comm', label: '💬 Communication' },
  { id: 'data', label: '🌤 Data & Weather' },
];

export default function SuperApiManagementPage() {
  const [apis, setApis] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [coreLatency, setCoreLatency] = useState('Measuring...');
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

    // Measure live backend core probe latency
    const probeStart = performance.now();
    healthApi
      .check()
      .then(() => {
        const elapsed = Math.round(performance.now() - probeStart);
        setCoreLatency(`${elapsed}ms (Live Probe)`);
      })
      .catch(() => {
        setCoreLatency('Probe Unavailable');
      });

    try {
      const [integrationsData, logsData] = await Promise.all([
        systemConfigApi.getIntegrations(),
        systemConfigApi.getAuditLogs(),
      ]);

      if (Array.isArray(integrationsData)) {
        setApis(integrationsData);
      }
      if (Array.isArray(logsData)) {
        setAuditLogs(logsData);
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load third-party integrations from backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalConnected = apis.length;
  const activeCount = apis.filter((a) => a.status === 'Active').length;
  const externalDemoCount = apis.filter((a) => a.isDemo).length;

  const toggleApiStatus = async (id) => {
    const target = apis.find((a) => a.id === id);
    if (!target) return;

    const nextStatus = target.status === 'Active' ? 'Inactive' : 'Active';

    try {
      const updated = await systemConfigApi.updateIntegration(id, { status: nextStatus });
      setApis((prev) => prev.map((a) => (a.id === id ? updated : a)));

      // Refresh audit logs
      const freshLogs = await systemConfigApi.getAuditLogs();
      if (Array.isArray(freshLogs)) {
        setAuditLogs(freshLogs);
      }

      showToast(`${updated.name} status switched to ${updated.status}! ✓`);
    } catch (err) {
      showToast(err.message || 'Failed to update integration status', 'error');
    }
  };

  const filteredApis = apis.filter((a) => {
    const matchCategory = activeCategory === 'all' || a.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <h1>Third-Party API & Service Integrations</h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Monitor measured backend latency, simulation connectors, environment profiles, and service availability.
          </p>
        </div>
      </header>

      {/* Honest Architecture & Integration Notice Banner */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '20px', marginTop: '2px' }}>ℹ️</span>
        <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
          <strong>Service Status Disclosure:</strong> External third-party services (Amadeus, Skyscanner, Booking.com, Airbnb, Stripe, PayPal, Google Maps, Twilio, SendGrid, OpenWeather) operate with simulated sandbox connectors. No live external subscription or paid API key is claimed or configured in this environment. The <strong>GlobeSync Core REST Engine</strong> is live and actively measured.
        </div>
      </div>

      {/* Load Error Banner */}
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
            <div>Failed to load integration states from backend</div>
            <div style={{ fontSize: '13px', fontWeight: 400, marginTop: '2px' }}>{loadError}</div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard label="Total Cataloged Services" value={totalConnected} style={{ borderRadius: 12 }} />
        <SummaryCard
          label="Active Services"
          value={<span style={{ color: '#059669', fontWeight: 800 }}>{activeCount} / {totalConnected}</span>}
          style={{ borderRadius: 12 }}
        />
        <SummaryCard
          label="Simulation Connectors"
          value={<span style={{ color: '#d97706', fontWeight: 800 }}>{externalDemoCount} Demo</span>}
          style={{ borderRadius: 12 }}
        />
        <SummaryCard label="Core Engine Probe Latency" value={coreLatency} style={{ borderRadius: 12 }} />
      </div>

      {/* Category Tabs & Search */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`btn btn-sm ${activeCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '20px', padding: '6px 14px' }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Filter integrations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            minWidth: '220px',
          }}
        />
      </div>

      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <div className="admin-spinner" style={{ margin: '0 auto 12px' }} />
          Loading service integrations from backend...
        </div>
      ) : (
        <>
          {/* API Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
              marginBottom: '32px',
            }}
          >
            {filteredApis.map((api) => {
              const quotaPct = api.limit ? Math.min(100, Math.round((api.usage / api.limit) * 100)) : 0;
              const displayLatency = api.isDemo ? 'Unavailable (Demo)' : coreLatency;

              return (
                <div
                  key={api.id}
                  className="card"
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            background: api.isDemo ? '#fef3c7' : '#ecfdf5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                          }}
                        >
                          {api.icon}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{api.name}</h3>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: api.isDemo ? '#b45309' : '#047857',
                            }}
                          >
                            {api.isDemo ? 'Demo Simulation' : 'Live Platform Service'}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={api.status} />
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', minHeight: '38px', lineHeight: 1.4 }}>
                      {api.desc}
                    </p>

                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--muted)' }}>Quota Usage</span>
                        <span style={{ fontWeight: 600 }}>
                          {api.isDemo ? '0 / Simulated' : `${api.usage.toLocaleString()} / ${api.limit.toLocaleString()}`}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${quotaPct}%`,
                            height: '100%',
                            background: quotaPct > 80 ? '#ef4444' : '#6366f1',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
                      <span>Latency: <strong style={{ color: '#1e293b' }}>{displayLatency}</strong></span>
                      <span>Env: <strong style={{ color: '#1e293b' }}>{api.env}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {api.key}
                    </span>
                    <button
                      type="button"
                      className={`btn btn-sm ${api.status === 'Active' ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => toggleApiStatus(api.id)}
                    >
                      {api.status === 'Active' ? 'Disable Service' : 'Enable Service'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-Time API Health Monitor */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
              API Health & Availability Monitor
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th>Category</th>
                    <th>Environment</th>
                    <th>Integration Type</th>
                    <th>Health Status</th>
                    <th>Measured Response Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {apis.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ marginRight: '8px' }}>{a.icon}</span>
                        {a.name}
                      </td>
                      <td style={{ textTransform: 'capitalize', color: 'var(--muted)' }}>{a.category}</td>
                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', fontSize: '11px' }}>
                          {a.env}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: a.isDemo ? '#fef3c7' : '#ecfdf5',
                            color: a.isDemo ? '#92400e' : '#065f46',
                          }}
                        >
                          {a.isDemo ? 'Demo Connector' : 'Production Core'}
                        </span>
                      </td>
                      <td><StatusBadge status={a.status} /></td>
                      <td style={{ fontWeight: 600, color: a.isDemo ? 'var(--muted)' : '#059669' }}>
                        {a.isDemo ? 'Unavailable (Demo)' : coreLatency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Trail for Integration Toggles */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
              Integration & Connector Audit Trail
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              {auditLogs.filter((l) => l.category === 'integration' || l.category === 'rules').length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '13px', fontStyle: 'italic', padding: '12px 0' }}>
                  No integration modifications recorded yet.
                </div>
              ) : (
                auditLogs
                  .filter((l) => l.category === 'integration' || l.category === 'rules')
                  .map((log) => (
                    <div
                      key={log.id}
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
                          background: log.color || '#f59e0b',
                          marginTop: '6px',
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {log.text}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                          {log.author} • {log.time || (log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent')}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </>
      )}

      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
    </div>
  );
}
