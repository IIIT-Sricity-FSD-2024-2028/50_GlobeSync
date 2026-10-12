// Auth check
if (!Auth.isLoggedIn() || Auth.getRole() !== 'traveler') window.location.href = '../traveler-login.html';
const user = Auth.getUser();
document.getElementById('user-name').textContent = user.name.split(' ')[0];

const uid = getUserId();

// Load trips from backend
async function loadTrips() {
  try {
    const myTrips = await apiGetSnake(`/trips/traveler/${uid}`);
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
  } catch (e) {
    console.error('Failed to load trips:', e);
  }
}

// Load stats from backend dashboard API
async function loadStats() {
  try {
    const dash = await apiGetSnake(`/dashboard/traveler/${uid}`);
    document.getElementById('active-trips').textContent = dash.my_trips_count;
    document.getElementById('upcoming-bookings').textContent = dash.my_bookings_count;
    document.getElementById('total-spent').textContent = formatCurrency(dash.my_expenses_total);
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

// Notifications (kept local — no backend endpoint for notifications)
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

// Packages from backend
async function renderPackages() {
  try {
    const allPackages = await apiGetSnake('/packages');
    const packages = allPackages.slice(0, 4);
    const container = document.getElementById('packages-list');
    container.innerHTML = packages.map(p => `
      <div class="package-card" onclick="bookPackage(${p.package_id})">
        <div class="package-img-wrap"><img src="${getDestImg(p.destinations)}" alt="${p.title || p.name}"></div>
        <div class="package-body-lite">
          <div class="package-n">${p.title || p.name}</div>
          <div class="package-d">${p.duration}D • ${p.destinations}</div>
          <div class="package-p">${formatCurrency(p.budget)}</div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Failed to load packages:', e);
  }
}

async function bookPackage(id) {
  try {
    const allPackages = await apiGetSnake('/packages');
    const pkg = allPackages.find(p => p.package_id === id);
    if (!pkg) return;

    const allGuides = await apiGetSnake('/guides');
    const randomGuide = allGuides.length > 0 ? allGuides[Math.floor(Math.random() * allGuides.length)] : null;

    confirmAction(`Book "${pkg.title || pkg.name}" package?`, async () => {
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const endWeek = new Date(Date.now() + (7 + pkg.duration) * 86400000).toISOString().split('T')[0];

      // Create trip via API
      const newTrip = await apiPostSnake('/trips', {
        destination: pkg.destinations.split(',')[0].trim(),
        start_date: nextWeek,
        end_date: endWeek,
        budget: pkg.budget,
        traveler_id: uid,
        guide_id: randomGuide ? randomGuide.guide_id : null,
        package_id: pkg.package_id,
        status: 'Pending'
      });

      // Create booking via API
      await apiPostSnake('/bookings', {
        traveler_id: uid,
        trip_id: newTrip.trip_id,
        service: `${pkg.title || pkg.name} Package`,
        type: 'Activity',
        booking_date: new Date().toISOString().split('T')[0],
        status: 'Confirmed',
        amount: pkg.budget
      });

      // Send message to guide if assigned
      if (randomGuide) {
        await apiPost('/messages', {
          sender: 'traveler',
          senderId: uid,
          receiver: 'guide',
          receiverId: randomGuide.guide_id,
          content: `Hi! I've just booked the ${pkg.title || pkg.name} package to ${newTrip.destination}. Looking forward to your guidance!`
        });
      }

      showToast(`🎉 Success! Your trip to ${newTrip.destination} has been booked!`);
      setTimeout(() => { window.location.href = 'my-trips.html'; }, 1500);
    });
  } catch (e) {
    console.error('Failed to book package:', e);
  }
}

// Init
loadTrips();
loadStats();
renderNotifs();
renderPackages();
