import React, { useState } from 'react';
import Toast from '../../components/common/Toast';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';

const INITIAL_APIS = [
  {
    id: 1,
    name: 'Amadeus',
    icon: '✈️',
    category: 'travel',
    status: 'Active',
    desc: 'Flight search, booking, and dynamic airline pricing data',
    key: 'ama_live_8392019472...',
    usage: 5623,
    limit: 250000,
    lastTested: '30 mins ago',
    env: 'Sandbox',
    latency: '184ms',
  },
  {
    id: 2,
    name: 'Skyscanner',
    icon: '🔍',
    category: 'travel',
    status: 'Active',
    desc: 'Flight comparison and route aggregator data',
    key: 'sky_prod_99182312...',
    usage: 3421,
    limit: 100000,
    lastTested: '1 hour ago',
    env: 'Production',
    latency: '220ms',
  },
  {
    id: 3,
    name: 'Booking.com',
    icon: '🏨',
    category: 'travel',
    status: 'Active',
    desc: 'Hotel reservations and accommodation partner catalog',
    key: 'bk_live_00192831...',
    usage: 1876,
    limit: 150000,
    lastTested: '3 hours ago',
    env: 'Production',
    latency: '310ms',
  },
  {
    id: 4,
    name: 'Airbnb Experiences',
    icon: '🏡',
    category: 'travel',
    status: 'Inactive',
    desc: 'Boutique stay listings and local culinary experiences',
    key: 'air_sandbox_xxx...',
    usage: 0,
    limit: 50000,
    lastTested: 'N/A',
    env: 'Sandbox',
    latency: 'Offline',
  },
  {
    id: 5,
    name: 'Stripe Gateway',
    icon: '💳',
    category: 'payment',
    status: 'Active',
    desc: 'Primary credit/debit card processing and automated webhooks',
    key: 'sk_live_948291834...',
    usage: 1247,
    limit: 500000,
    lastTested: '10 mins ago',
    env: 'Production',
    latency: '95ms',
  },
  {
    id: 6,
    name: 'PayPal International',
    icon: '🅿️',
    category: 'payment',
    status: 'Active',
    desc: 'Cross-border digital wallet and currency conversion engine',
    key: 'pp_live_10928374...',
    usage: 832,
    limit: 200000,
    lastTested: '25 mins ago',
    env: 'Production',
    latency: '142ms',
  },
  {
    id: 7,
    name: 'Google Maps Platform',
    icon: '📍',
    category: 'maps',
    status: 'Active',
    desc: 'Interactive itinerary mapping, geocoding, and distance calculations',
    key: 'AIzaSyA8392019...',
    usage: 8942,
    limit: 1000000,
    lastTested: '5 mins ago',
    env: 'Production',
    latency: '45ms',
  },
  {
    id: 8,
    name: 'Twilio SMS',
    icon: '💬',
    category: 'comm',
    status: 'Active',
    desc: 'Transactional SMS notifications and two-factor dispatch',
    key: 'AC938201948271...',
    usage: 421,
    limit: 50000,
    lastTested: '4 hours ago',
    env: 'Production',
    latency: '260ms',
  },
  {
    id: 9,
    name: 'SendGrid Mailer',
    icon: '📧',
    category: 'comm',
    status: 'Active',
    desc: 'System emails, trip PDF tickets, and booking invoice receipts',
    key: 'SG.93820194827...',
    usage: 2314,
    limit: 100000,
    lastTested: '15 mins ago',
    env: 'Production',
    latency: '110ms',
  },
  {
    id: 10,
    name: 'OpenWeather API',
    icon: '🌤',
    category: 'data',
    status: 'Active',
    desc: 'Real-time destination forecast widgets and trip advisory data',
    key: 'ow_live_7381920...',
    usage: 1205,
    limit: 60000,
    lastTested: '20 mins ago',
    env: 'Production',
    latency: '130ms',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Services' },
  { id: 'payment', label: '💳 Payment' },
  { id: 'travel', label: '✈ Travel & Booking' },
  { id: 'maps', label: '📍 Maps & Geo' },
  { id: 'comm', label: '💬 Communication' },
  { id: 'data', label: '🌤 Data & Weather' },
];

export default function SuperApiManagementPage() {
  const [apis, setApis] = useState(INITIAL_APIS);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const totalConnected = apis.length;
  const activeCount = apis.filter((a) => a.status === 'Active').length;
  const totalRequests = apis.reduce((sum, a) => sum + a.usage, 0);

  const toggleApiStatus = (id) => {
    setApis((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextStatus = a.status === 'Active' ? 'Inactive' : 'Active';
          setToastMessage(`${a.name} status switched to ${nextStatus}! ✓`);
          setTimeout(() => setToastMessage(''), 3000);
          return { ...a, status: nextStatus };
        }
        return a;
      })
    );
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
            Monitor real-time latency, usage quotas, API keys, and external service availability.
          </p>
        </div>
      </header>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <SummaryCard label="Total Services" value={totalConnected} style={{ borderRadius: 12 }} />
        <SummaryCard
          label="Active Integrations"
          value={<span style={{ color: '#059669' }}>{activeCount} / {totalConnected}</span>}
          style={{ borderRadius: 12 }}
        />
        <SummaryCard
          label="Monthly API Calls"
          value={totalRequests.toLocaleString('en-IN')}
          style={{ borderRadius: 12 }}
        />
        <SummaryCard label="Avg Response Latency" value="154ms" style={{ borderRadius: 12 }} />
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
                        background: '#f1f5f9',
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
                      <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                        {api.env}
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
                    <span style={{ fontWeight: 600 }}>{api.usage.toLocaleString()} / {api.limit.toLocaleString()}</span>
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
                  <span>Latency: <strong style={{ color: '#1e293b' }}>{api.latency}</strong></span>
                  <span>Tested: <strong style={{ color: '#1e293b' }}>{api.lastTested}</strong></span>
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
                  {api.status === 'Active' ? 'Disable API' : 'Enable API'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-Time API Health Monitor */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
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
                <th>Health Status</th>
                <th>Response Latency</th>
                <th>Monthly Calls</th>
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
                  <td><StatusBadge status={a.status} /></td>
                  <td style={{ fontWeight: 600 }}>{a.latency}</td>
                  <td style={{ color: 'var(--muted)' }}>{a.usage.toLocaleString()} reqs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Toast message={toastMessage} type="success" onClose={() => setToastMessage('')} />
    </div>
  );
}
