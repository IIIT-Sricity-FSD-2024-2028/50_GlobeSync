// =========================
// SHARED UTILITIES
// =========================

// Toast notifications
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Modal helpers
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Form validation
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return false;
  const inputs = form.querySelectorAll('[data-required]');
  let valid = true;
  inputs.forEach(input => {
    const errorEl = document.getElementById(input.id + '-error');
    const val = input.value.trim();
    let msg = '';
    
    if (!val) {
      msg = input.dataset.required || 'This field is required';
    } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      msg = 'Please enter a valid email address';
    } else if (input.dataset.type === 'phone' && !/^\d{10}$/.test(val)) {
      msg = 'Phone number must be exactly 10 digits (numeric only)';
    } else if (input.dataset.minlen && val.length < parseInt(input.dataset.minlen)) {
      msg = `Minimum ${input.dataset.minlen} characters required`;
    } else if (input.dataset.match) {
      const matchVal = document.getElementById(input.dataset.match).value;
      if (val !== matchVal) msg = 'Passwords do not match';
    } else if (input.dataset.min && parseFloat(val) < parseFloat(input.dataset.min)) {
      msg = `Minimum value is ${input.dataset.min}`;
    } else if (input.type === 'number' && isNaN(val)) {
      msg = 'Must be a valid number';
    } else if (input.type === 'date') {
      const d = new Date(val);
      if (d.toString() === "Invalid Date") msg = "Invalid date";
    }

    if (msg) {
      input.classList.add('error');
      if (errorEl) { errorEl.textContent = msg; errorEl.classList.add('show'); }
      valid = false;
    } else {
      input.classList.remove('error');
      if (errorEl) errorEl.classList.remove('show');
    }
  });
  return valid;
}

// Clear validation on input
function setupLiveValidation(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('[data-required]').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('error');
      const errorEl = document.getElementById(input.id + '-error');
      if (errorEl) errorEl.classList.remove('show');
    });
  });
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Format currency
function formatCurrency(amount) { return '₹' + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

// Status badge HTML
function statusBadge(status) {
  const map = {
    'Confirmed': 'badge-success', 'confirmed': 'badge-success',
    'Paid': 'badge-success', 'paid': 'badge-success',
    'Active': 'badge-success', 'active': 'badge-success',
    'Completed': 'badge-success', 'completed': 'badge-success',
    'Resolved': 'badge-success',
    'Pending': 'badge-warning', 'pending': 'badge-warning',
    'Planning': 'badge-warning', 'In Progress': 'badge-info',
    'Processing': 'badge-info',
    'Open': 'badge-pink', 'open': 'badge-pink',
    'Draft': 'badge-gray', 'Inactive': 'badge-gray', 'inactive': 'badge-gray',
    'Cancelled': 'badge-danger', 'cancelled': 'badge-danger',
    'Failed': 'badge-danger',
    'High': 'badge-danger', 'Medium': 'badge-warning', 'Low': 'badge-success'
  };
  const cls = map[status] || 'badge-gray';
  return `<span class="badge ${cls}">${status}</span>`;
}

// Destination Image Helper
function getDestImg(destName = '') {
  const d = destName.toLowerCase();
  let img = 'default-trip.png';
  if (d.includes('paris') || d.includes('louvre')) img = 'paris.png';
  else if (d.includes('tokyo') || d.includes('kyoto') || d.includes('shibuya')) img = 'tokyo.png';
  else if (d.includes('swiss') || d.includes('alps') || d.includes('zurich') || d.includes('interlaken') || d.includes('zermatt')) img = 'swiss_alps.png';
  else if (d.includes('bali') || d.includes('ubud') || d.includes('seminyak') || d.includes('nusa dua')) img = 'bali.png';
  else if (d.includes('new york') || d.includes('nyc') || d.includes('manhattan')) img = 'new_york.png';
  else if (d.includes('dubai') || d.includes('abu dhabi')) img = 'dubai.png';
  else if (d.includes('goa') || d.includes('baga') || d.includes('aguada')) img = 'goa.png';
  else if (d.includes('kerala') || d.includes('munnar') || d.includes('alleppey') || d.includes('kochi')) img = 'kerala.png';
  else if (d.includes('singapore') || d.includes('malaysia')) img = 'singapore.png';
  else if (d.includes('rajasthan') || d.includes('jaipur') || d.includes('udaipur') || d.includes('jodhpur')) img = 'rajasthan.png';
  
  const path = window.location.pathname.toLowerCase();
  const isDepth = path.includes('/traveler/') || path.includes('\\traveler\\') ||
                  path.includes('/admin/') || path.includes('\\admin\\') ||
                  path.includes('/support/') || path.includes('\\support\\') ||
                  path.includes('/super/') || path.includes('\\super\\') ||
                  path.includes('/guide/') || path.includes('\\guide\\');
                  
  const prefix = isDepth ? '../static/destinations/' : 'static/destinations/';
  return prefix + img;
}

// Unified Auth & Logout Helpers
function logout() {
  // Clear only session-specific data to preserve the mock database (gs_database)
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  localStorage.removeItem("currentUser");
  sessionStorage.clear();
  
  // Safely redirect to role selection regardless of current path depth
  const path = window.location.pathname;
  const isNested = path.includes('/admin/') || path.includes('/Traveler/') || path.includes('/super/') || path.includes('/guide/') || path.includes('/support/');
  
  const redirectPath = isNested ? '../role-select.html' : 'role-select.html';
  window.location.href = redirectPath;
}

// Confirm delete
function confirmDelete(message, callback) {
  if (confirm(message || 'Are you sure you want to delete this?')) callback();
}

// Confirm general action
function confirmAction(message, callback) {
  if (confirm(message || 'Are you sure you want to proceed?')) callback();
}

// Generate unique ID
function generateId(arr, key) {
  return arr.length > 0 ? Math.max(...arr.map(i => i[key])) + 1 : 1;
}

// Search/filter table
function filterTable(inputId, tableBodyId) {
  const input = document.getElementById(inputId);
  const tbody = document.getElementById(tableBodyId);
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    Array.from(tbody.rows).forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

// Generate default bookings for a new trip
function generateDefaultBookings(tripId, travelerId, destination, totalBudget) {
  const flightAmount = Math.floor(totalBudget * 0.4);
  const hotelAmount = Math.floor(totalBudget * 0.5);
  const today = new Date().toISOString().split('T')[0];
  
  const flightId = generateId(DB.bookings, 'booking_id');
  const flight = {
    booking_id: flightId,
    trip_id: tripId,
    traveler_id: travelerId,
    service: `Flight to ${destination}`,
    type: 'Flight',
    booking_date: today,
    status: 'Pending',
    amount: flightAmount
  };
  DB.bookings.push(flight);
  
  const hotelId = generateId(DB.bookings, 'booking_id');
  const hotel = {
    booking_id: hotelId,
    trip_id: tripId,
    traveler_id: travelerId,
    service: `Resort at ${destination}`,
    type: 'Hotel',
    booking_date: today,
    status: 'Pending',
    amount: hotelAmount
  };
  DB.bookings.push(hotel);
  return [flightId, hotelId];
}

// Sidebar active state
function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
}

// Ensure Auth works smoothly (fallback if mockData is missing)
const AuthFallback = {
  isLoggedIn: () => !!localStorage.getItem('user') || !!localStorage.getItem('currentUser'),
  getRole: () => localStorage.getItem('role') || localStorage.getItem('role'),
  getUser: () => JSON.parse(localStorage.getItem('user')) || JSON.parse(localStorage.getItem('currentUser'))
};
if (typeof Auth === 'undefined') window.Auth = AuthFallback;

// ================= ENHANCED VALIDATION =================
// Merged into primary validator.

// DateTime formatting
function formatMsgTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
}

function formatDate(dateStr) {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString(undefined, options);
}

function formatCurrency(amount) {
  return '₹' + amount.toLocaleString('en-IN');
}

function statusBadge(status) {
  const colors = {
    'Confirmed': 'success',
    'Pending': 'warning',
    'Completed': 'info',
    'Cancelled': 'danger',
    'Planning': 'secondary'
  };
  return `<span class="badge ${colors[status] || 'secondary'}">${status}</span>`;
}