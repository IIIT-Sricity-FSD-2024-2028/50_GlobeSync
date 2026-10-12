// =========================
// GLOBESYNC — NOTIFICATION PANEL
// Shared across all role dashboards
// =========================

const NOTIF_KEY = 'gs_notifications';

// Default notifications per role
function getDefaultNotifs(role) {
  const all = {
    traveler: [
      { id: 1, type: 'success', icon: '✅', title: 'Booking Confirmed', desc: 'Your trip to Paris has been confirmed. Check your itinerary for details.', time: '5 minutes ago', unread: true },
      { id: 2, type: 'message', icon: '💬', title: 'New Message from Guide', desc: 'Marie sent you recommendations for local restaurants in Paris.', time: '1 hour ago', unread: true },
      { id: 3, type: 'payment', icon: '💳', title: 'Payment Successful', desc: 'Your payment of ₹1,12,000 for Paris trip has been processed.', time: '2 hours ago', unread: false },
      { id: 4, type: 'warning', icon: '⏰', title: 'Trip Reminder', desc: 'Your Tokyo trip starts in 3 days. Review your itinerary.', time: '5 hours ago', unread: false },
      { id: 5, type: 'info', icon: '✈️', title: 'Flight Update', desc: 'Your Air France flight XY123 is on schedule.', time: '1 day ago', unread: false },
    ],
    admin: [
      { id: 1, type: 'warning', icon: '⚠️', title: 'New High Priority Ticket', desc: 'Ticket #101 — Hotel booking mismatch reported by Arjun Mehta.', time: '10 minutes ago', unread: true },
      { id: 2, type: 'success', icon: '✅', title: 'Booking Confirmed', desc: 'Trip to New York for Rohan Varma is now confirmed.', time: '30 minutes ago', unread: true },
      { id: 3, type: 'info', icon: '👥', title: 'New Traveler Registered', desc: 'Kavya Desai joined the platform and booked a trip.', time: '2 hours ago', unread: false },
      { id: 4, type: 'payment', icon: '💰', title: 'Revenue Milestone', desc: 'Monthly revenue crossed ₹10,00,000. Great performance!', time: '1 day ago', unread: false },
    ],
    superuser: [
      { id: 1, type: 'warning', icon: '⚠️', title: 'Email Service Delay', desc: 'SendGrid email service is experiencing delays. Monitoring.', time: '2 hours ago', unread: true },
      { id: 2, type: 'success', icon: '✅', title: 'Database Backup Complete', desc: 'Nightly backup completed successfully. All systems green.', time: '5 hours ago', unread: true },
      { id: 3, type: 'info', icon: '🔌', title: 'API Rate Limit Alert', desc: 'Amadeus API approaching 80% of monthly usage limit.', time: '1 day ago', unread: false },
      { id: 4, type: 'success', icon: '🛡️', title: 'Security Scan Passed', desc: 'Weekly security scan completed. No vulnerabilities found.', time: '2 days ago', unread: false },
    ],
    guide: [
      { id: 1, type: 'success', icon: '👤', title: 'New Traveler Assigned', desc: 'Arjun Mehta has been added to your traveler list for Paris trip.', time: '15 minutes ago', unread: true },
      { id: 2, type: 'message', icon: '💬', title: 'Message from Traveler', desc: 'Kavya Desai asked about the Swiss Alps tour schedule.', time: '1 hour ago', unread: true },
      { id: 3, type: 'info', icon: '📅', title: 'Trip Update', desc: "Rohan's New York trip has been confirmed. Prepare itinerary.", time: '3 hours ago', unread: false },
    ],
    support: [
      { id: 1, type: 'warning', icon: '🎫', title: 'New High Priority Ticket', desc: 'Ticket #103 — Payment not reflecting for Rohan Varma.', time: '5 minutes ago', unread: true },
      { id: 2, type: 'success', icon: '✅', title: 'Ticket Resolved', desc: 'Ticket #102 — Flight cancellation refund processed successfully.', time: '2 hours ago', unread: true },
      { id: 3, type: 'info', icon: '🔄', title: 'Refund Initiated', desc: 'Refund of ₹99,000 for Kavya Desai has been initiated.', time: '4 hours ago', unread: false },
    ],
  };
  return all[role] || all['traveler'];
}

// Load notifications from sessionStorage or use defaults
function loadNotifs(role) {
  const stored = localStorage.getItem(NOTIF_KEY + '_' + role);
  if (stored) return JSON.parse(stored);
  const defaults = getDefaultNotifs(role);
  saveNotifs(role, defaults);
  return defaults;
}

function saveNotifs(role, notifs) {
  localStorage.setItem(NOTIF_KEY + '_' + role, JSON.stringify(notifs));
}

// Build and inject the notification panel HTML into the page
function initNotificationPanel(role) {
  // Remove existing panel if any
  const existing = document.getElementById('gs-notif-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'gs-notif-panel';
  panel.className = 'notif-panel';
  panel.innerHTML = `
    <div class="notif-panel-header">
      <div>
        <div class="notif-panel-title">🔔 Notifications</div>
        <div class="notif-panel-sub" id="notif-unread-text">Loading...</div>
      </div>
      <button class="notif-panel-close" onclick="closeNotifPanel()" title="Close">✕</button>
    </div>
    <div class="notif-actions">
      <button class="btn btn-secondary btn-sm" onclick="markAllRead('${role}')">✓ Mark All Read</button>
      <button class="btn btn-danger btn-sm" onclick="clearAllNotifs('${role}')">✕ Clear All</button>
    </div>
    <div class="notif-scroll-area" id="notif-list-items"></div>
    <div class="notif-panel-footer">
      <a href="#" onclick="markAllRead('${role}');return false;">View All Notifications</a>
    </div>
  `;
  document.body.appendChild(panel);

  // Close when clicking outside
  document.addEventListener('click', function(e) {
    const panel = document.getElementById('gs-notif-panel');
    const btn   = document.getElementById('gs-notif-btn');
    if (panel && panel.classList.contains('open')) {
      if (!panel.contains(e.target) && (!btn || !btn.contains(e.target))) {
        panel.classList.remove('open');
      }
    }
  });

  renderNotifList(role);
}

function renderNotifList(role) {
  const notifs = loadNotifs(role);
  const unreadCount = notifs.filter(n => n.unread).length;

  // Update badge
  const badge = document.getElementById('gs-notif-badge');
  if (badge) {
    badge.textContent = unreadCount;
    badge.classList.toggle('hidden', unreadCount === 0);
  }

  // Update sub-text
  const sub = document.getElementById('notif-unread-text');
  if (sub) sub.textContent = unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!';

  // Render list
  const list = document.getElementById('notif-list-items');
  if (!list) return;

  if (notifs.length === 0) {
    list.innerHTML = `<div class="notif-empty"><div class="notif-empty-icon">🔔</div><p>No notifications yet</p></div>`;
    return;
  }

  list.innerHTML = notifs.map(n => `
    <div class="notif-row ${n.unread ? 'unread' : ''}" onclick="markOneRead('${role}', ${n.id})">
      <div class="notif-icon-wrap ${n.type}">${n.icon}</div>
      <div class="notif-content">
        <div class="notif-row-title">${n.title}</div>
        <div class="notif-row-desc">${n.desc}</div>
        <div class="notif-row-time">🕐 ${n.time}</div>
      </div>
      ${n.unread ? '<div class="unread-dot"></div>' : ''}
    </div>
  `).join('');
}

function toggleNotifPanel(role) {
  const panel = document.getElementById('gs-notif-panel');
  if (!panel) { initNotificationPanel(role); return; }
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) renderNotifList(role);
}

function closeNotifPanel() {
  const panel = document.getElementById('gs-notif-panel');
  if (panel) panel.classList.remove('open');
}

function markAllRead(role) {
  const notifs = loadNotifs(role).map(n => ({ ...n, unread: false }));
  saveNotifs(role, notifs);
  renderNotifList(role);
  if (typeof showToast === 'function') showToast('All notifications marked as read ✓');
}

function markOneRead(role, id) {
  const notifs = loadNotifs(role).map(n => n.id === id ? { ...n, unread: false } : n);
  saveNotifs(role, notifs);
  renderNotifList(role);
}

function clearAllNotifs(role) {
  saveNotifs(role, []);
  renderNotifList(role);
  if (typeof showToast === 'function') showToast('Notifications cleared');
}

// Helper to add a new notification programmatically
function addNotif(role, type, icon, title, desc) {
  const notifs = loadNotifs(role);
  const newNotif = {
    id: Date.now(),
    type: type,
    icon: icon,
    title: title,
    desc: desc,
    time: 'Just now',
    unread: true
  };
  notifs.unshift(newNotif); // Add to top
  saveNotifs(role, notifs);
  
  // If we are currently on a page with a notification bell, refresh it
  const badge = document.getElementById('gs-notif-badge');
  if (badge) renderNotifList(role);
}

// Create and inject the bell button into the topbar
function injectNotifBell(role) {
  // Find topbar-actions if it exists (admin/super/guide/support dashboards)
  let target = document.querySelector('.topbar-actions');

  // For traveler dashboard which has a different structure
  if (!target) {
    target = document.querySelector('.topbar');
  }

  if (!target) return;

  const bellBtn = document.createElement('button');
  bellBtn.id = 'gs-notif-btn';
  bellBtn.className = 'notif-bell-btn';
  bellBtn.title = 'Notifications';
  bellBtn.setAttribute('aria-label', 'Open notifications');
  bellBtn.innerHTML = `🔔<span class="notif-badge hidden" id="gs-notif-badge">0</span>`;
  bellBtn.onclick = (e) => { e.stopPropagation(); toggleNotifPanel(role); };

  // For topbar-actions, prepend the bell
  if (target.classList.contains('topbar-actions')) {
    target.insertBefore(bellBtn, target.firstChild);
  } else {
    // Traveler topbar — append inside topbar
    target.appendChild(bellBtn);
  }

  // Initialize the panel (builds HTML, registers listeners)
  initNotificationPanel(role);
}
