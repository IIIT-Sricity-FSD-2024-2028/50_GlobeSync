// Auth check
if (!Auth.isLoggedIn() || Auth.getRole() !== 'traveler') window.location.href = '../traveler-login.html';
const user = Auth.getUser();
document.getElementById('user-name').textContent = user.name.split(' ')[0];

// Load trips
function loadTrips() {
  const myTrips = DB.trips.filter(t => t.traveler_id === user.traveler_id);
  const container = document.getElementById('trips-list');
  if (myTrips.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🗺</div><h3>No trips yet</h3><p>Start planning your adventure!</p><a href="create-itinerary.html" class="btn btn-primary btn-sm">+ Create Trip</a></div>`;
    return;
  }
  container.innerHTML = myTrips.slice(0, 2).map(t => {
    const tripImg = getDestImg(t.destination);
    return `
    <div class="trip-list-item" style="cursor:pointer" onclick="location.href='my-trips.html'">
      <div class="trip-box-img" style="background:url('${tripImg}') center/cover no-repeat; border:none"></div>
      <div class="trip-text-col">
        <div class="trip-dest">${t.destination}</div>
        <div class="trip-dates">${formatDate(t.start_date)} - ${formatDate(t.end_date)}</div>
        ${statusBadge(t.status)}
      </div>
      <div class="arr-icon">→</div>
    </div>`;
  }).join('');
}

// Load stats
function loadStats() {
  const myTrips = DB.trips.filter(t => t.traveler_id === user.traveler_id);
  const myBookings = DB.bookings.filter(b => b.traveler_id === user.traveler_id);
  const myPayments = DB.payments.filter(p => myBookings.some(b => b.booking_id === p.booking_id));
  const total = myPayments.reduce((s, p) => s + p.amount, 0);
  document.getElementById('active-trips').textContent = myTrips.length;
  document.getElementById('upcoming-bookings').textContent = myBookings.filter(b => b.status !== 'Cancelled').length;
  document.getElementById('total-spent').textContent = formatCurrency(total);
}

// Notifications
let notifications = [
  { id: 1, title: 'Booking Confirmed!', msg: 'Your trip to Paris has been confirmed.', time: '5 minutes ago', read: false, icon: '✅' },
  { id: 2, title: 'New Message from Guide', msg: 'Marie sent you recommendations for local restaurants.', time: '1 hour ago', read: false, icon: '💬' },
  { id: 3, title: 'Payment Successful', msg: 'Your payment of ₹70,000 for Paris trip has been processed.', time: '2 hours ago', read: true, icon: '💳' },
  { id: 4, title: 'Trip Reminder', msg: 'Your trip to Paris starts in 3 days.', time: '1 day ago', read: true, icon: '⏰' }
];

function renderNotifs() {
  const unread = notifications.filter(n => !n.read).length;
  document.getElementById('notif-count').textContent = unread;
  document.getElementById('notif-count').style.display = unread > 0 ? 'flex' : 'none';
  document.getElementById('notif-list').innerHTML = notifications.length === 0
    ? '<div style="padding:24px;text-align:center;color:#9ca3af">No notifications</div>'
    : notifications.map(n => `
      <div style="padding:14px 16px;border-bottom:1px solid #f3f4f6;display:flex;gap:12px;align-items:flex-start;background:${n.read ? '#fff' : '#ffeef5'}">
        <div style="font-size:20px">${n.icon}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px;margin-bottom:2px">${n.title}</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:4px">${n.msg}</div>
          <div style="font-size:12px;color:#9ca3af">🕐 ${n.time}</div>
        </div>
        ${!n.read ? '<div style="width:8px;height:8px;background:#E8467C;border-radius:50%;margin-top:6px;flex-shrink:0"></div>' : ''}
      </div>`).join('');
}

function toggleNotif() {
  const panel = document.getElementById('notif-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'block') renderNotifs();
}

function markAllRead() {
  notifications.forEach(n => n.read = true);
  renderNotifs();
  showToast('All notifications marked as read');
}

function clearNotifs() {
  notifications = [];
  renderNotifs();
  showToast('Notifications cleared');
}

// Packages
function renderPackages() {
  const container = document.getElementById('packages-list');
  const packages = DB.packageTrips.slice(0, 4); // Show top 4
  
  container.innerHTML = packages.map(p => `
    <div class="package-card" onclick="bookPackage(${p.package_id})">
      <div class="package-img-wrap"><img src="${getDestImg(p.destinations)}" alt="${p.name}"></div>
      <div class="package-body-lite">
        <div class="package-n">${p.name}</div>
        <div class="package-d">${p.duration}D • ${p.destinations}</div>
        <div class="package-p">${formatCurrency(p.budget)}</div>
      </div>
    </div>
  `).join('');
}

function bookPackage(id) {
  const pkg = DB.packageTrips.find(p => p.package_id === id);
  if (!pkg) return;
  
  confirmAction(`Book "${pkg.name}" package?`, () => {
    const tripId = generateId(DB.trips, 'trip_id');
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const endWeek = new Date(Date.now() + (7 + pkg.duration) * 86400000).toISOString().split('T')[0];

    const newTrip = {
      trip_id: tripId,
      destination: pkg.destinations.split(',')[0].trim(),
      start_date: nextWeek,
      end_date: endWeek,
      budget: pkg.budget,
      traveler_id: user.traveler_id,
      guide_id: 1, // Default guide
      package_id: pkg.package_id,
      status: 'Pending'
    };

    const newBooking = {
      packagebooking_id: generateId(DB.packageBookings, 'packagebooking_id'),
      booking_date: today,
      status: 'Confirmed',
      traveler_id: user.traveler_id,
      package_id: pkg.package_id
    };

    DB.trips.push(newTrip);
    DB.packageBookings.push(newBooking);
    saveDB();

    showToast(`🎉 Success! Your trip to ${newTrip.destination} has been booked!`);
    
    // Add notification
    addNotif('traveler', 'success', '✈️', 'Package Booked', `You've successfully booked the ${pkg.name} package!`);
    
    setTimeout(() => {
      window.location.href = 'my-trips.html';
    }, 1500);
  });
}

// Init
loadTrips();
loadStats();
renderNotifs();
renderPackages();
