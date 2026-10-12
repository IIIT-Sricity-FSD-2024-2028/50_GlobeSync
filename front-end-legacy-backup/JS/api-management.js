// API Management — Super User
if (!Auth.isLoggedIn() || Auth.getRole() !== 'superuser') window.location.href = '../super-login.html';

const apis = [
  { id:1, name:'Amadeus', icon:'✈️', iconClass:'amadeus', category:'travel', status:'Active', desc:'Flight search, booking, and pricing data', key:'xxxxxxxxxxxxxxx...', usage:5623, limit:250000, lastTested:'30 minutes ago', env:'Sandbox' },
  { id:2, name:'Skyscanner', icon:'🔍', iconClass:'skyscanner', category:'travel', status:'Active', desc:'Flight comparison and search aggregator', key:'xxxxxxxxxxxx...', usage:3421, limit:100000, lastTested:'1 hour ago', env:'Production' },
  { id:3, name:'Booking.com', icon:'🏨', iconClass:'booking', category:'travel', status:'Active', desc:'Hotel and accommodation booking API', key:'xxxxxxxxxxxxxxx...', usage:1876, limit:150000, lastTested:'3 hours ago', env:'Production' },
  { id:4, name:'Airbnb', icon:'🏡', iconClass:'airbnb', category:'travel', status:'Inactive', desc:'Alternative accommodation and experiences', key:'', usage:0, limit:0, lastTested:'N/A', env:'Production' },
  { id:5, name:'Stripe', icon:'💳', iconClass:'stripe', category:'payment', status:'Active', desc:'Primary payment processing gateway', key:'sk_live_xxxxx...', usage:1247, limit:500000, lastTested:'10 minutes ago', env:'Production' },
  { id:6, name:'PayPal', icon:'🅿️', iconClass:'paypal', category:'payment', status:'Active', desc:'Alternative payment method', key:'client_xxxxx...', usage:856, limit:200000, lastTested:'45 minutes ago', env:'Production' },
  { id:7, name:'Razorpay', icon:'💰', iconClass:'razorpay', category:'payment', status:'Active', desc:'India-focused payment gateway', key:'rzp_live_xxxxx...', usage:2341, limit:300000, lastTested:'20 minutes ago', env:'Production' },
  { id:8, name:'IRCTC', icon:'🚂', iconClass:'irctc', category:'transport', status:'Active', desc:'Indian Railways booking integration', key:'irctc_api_xxxxx...', usage:4532, limit:200000, lastTested:'15 minutes ago', env:'Production' },
  { id:9, name:'RedBus', icon:'🚌', iconClass:'amadeus', category:'transport', status:'Active', desc:'Inter-city bus booking API', key:'redbus_xxxxx...', usage:2145, limit:150000, lastTested:'1 hour ago', env:'Production' },
  { id:10, name:'Google Maps', icon:'🗺️', iconClass:'booking', category:'maps', status:'Active', desc:'Maps, geocoding and directions', key:'AIzaSy_xxxxx...', usage:8921, limit:500000, lastTested:'5 minutes ago', env:'Production' },
  { id:11, name:'Twilio', icon:'📱', iconClass:'skyscanner', category:'comm', status:'Active', desc:'SMS and voice communication', key:'twilio_xxxxx...', usage:1523, limit:100000, lastTested:'2 hours ago', env:'Production' },
  { id:12, name:'OpenWeather', icon:'🌤️', iconClass:'razorpay', category:'data', status:'Active', desc:'Weather forecasts for destinations', key:'owm_xxxxx...', usage:6234, limit:300000, lastTested:'10 minutes ago', env:'Production' },
  { id:13, name:'Firebase Auth', icon:'🔐', iconClass:'stripe', category:'auth', status:'Active', desc:'User authentication service', key:'firebase_xxxxx...', usage:3456, limit:500000, lastTested:'Just now', env:'Production' }
];

const healthApis = [
  { name: 'Stripe', requests: '1,247 requests', errorRate: '1.2%', health: 92 },
  { name: 'PayPal', requests: '856 requests', errorRate: '1.7%', health: 88 },
  { name: 'Razorpay', requests: '2,341 requests', errorRate: '3.1%', health: 78 },
  { name: 'Amadeus', requests: '5,623 requests', errorRate: '2.2%', health: 85 },
  { name: 'Skyscanner', requests: '3,421 requests', errorRate: '3.4%', health: 76 },
  { name: 'Booking.com', requests: '1,876 requests', errorRate: '1.3%', health: 90 },
  { name: 'IRCTC', requests: '4,532 requests', errorRate: '2.3%', health: 84 },
  { name: 'RedBus', requests: '2,145 requests', errorRate: '2.1%', health: 86 }
];

let activeFilter = 'all';

function renderApis() {
  const filtered = activeFilter === 'all' ? apis : apis.filter(a => a.category === activeFilter);
  const grid = document.getElementById('api-grid');
  grid.innerHTML = filtered.map(api => {
    const usagePct = api.limit > 0 ? Math.round((api.usage / api.limit) * 100) : 0;
    const statusClass = api.status === 'Active' ? 'badge-success' : 'badge-gray';
    return `
    <div class="api-card">
      <div class="api-card-header">
        <div class="api-icon ${api.iconClass}">${api.icon}</div>
        <div>
          <div class="api-name">${api.name}</div>
          <div class="api-status"><span class="badge ${statusClass}">⊙ ${api.status}</span></div>
        </div>
      </div>
      <div class="api-desc">${api.desc}</div>
      ${api.key ? `
      <div class="api-detail-row"><span class="api-detail-label">API Key</span><span class="api-detail-value" style="font-family:monospace;font-size:12px">${api.key}</span></div>
      <div class="api-detail-row"><span class="api-detail-label">Usage Today</span><span class="api-detail-value">${api.usage.toLocaleString()} / ${api.limit.toLocaleString()}</span></div>
      <div class="api-usage-bar"><div class="api-usage-fill" style="width:${usagePct}%"></div></div>
      <div class="api-detail-row"><span class="api-detail-label">Last Tested</span><span class="api-detail-value">${api.lastTested}</span></div>
      ` : ''}
      <div class="api-detail-row"><span class="api-detail-label">Environment</span><span class="api-detail-value">${api.env}</span></div>
      <div class="api-card-actions">
        <button class="api-action-btn" onclick="testApi('${api.name}')">⬇ Test</button>
        <button class="api-action-btn" onclick="showToast('Config modal for ${api.name} (demo)')">⚙ Config</button>
        <button class="api-action-btn" onclick="toggleApiStatus(${api.id})">👁 Toggle</button>
      </div>
      <a href="#" class="api-doc-link" onclick="event.preventDefault(); showToast('Opening ${api.name} docs (demo)')">📄 View Documentation</a>
    </div>`;
  }).join('');
}

function renderHealthMonitor() {
  document.getElementById('health-monitor').innerHTML = healthApis.map(h => `
    <div class="health-row">
      <div class="health-icon">📡</div>
      <div class="health-name">${h.name}</div>
      <div class="health-bar"><div class="health-bar-fill" style="width:${h.health}%"></div></div>
      <div class="health-requests">${h.requests}</div>
      <div class="health-error">${h.errorRate}</div>
    </div>
  `).join('');
}

function testApi(name) {
  showToast(`Testing ${name} API... ✓ Response: 200 OK (${Math.floor(Math.random()*300)+50}ms)`, 'success');
}

function toggleApiStatus(id) {
  const api = apis.find(a => a.id === id);
  if (api) {
    api.status = api.status === 'Active' ? 'Inactive' : 'Active';
    renderApis();
    showToast(`${api.name} is now ${api.status}`, api.status === 'Active' ? 'success' : '');
  }
}

// Filter tab click handlers
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    renderApis();
  });
});

renderApis();
renderHealthMonitor();
showToast('API Management loaded ✓');
