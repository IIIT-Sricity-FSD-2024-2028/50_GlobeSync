if (!Auth.isLoggedIn() || Auth.getRole() !== 'admin') window.location.href = '../login.html?role=admin';
const user = Auth.getUser();
document.getElementById('welcome-msg').textContent = `Welcome back, ${user.name}!`;

document.getElementById('stat-bookings').textContent = DB.bookings.length;
document.getElementById('stat-trips').textContent = DB.trips.filter(t => t.status !== 'Cancelled').length;
document.getElementById('stat-revenue').textContent = formatCurrency(DB.payments.reduce((s,p)=>s+p.amount,0));

// Mini Bookings
document.getElementById('bookings-mini').innerHTML = DB.bookings.slice(0,5).map(b => `<tr><td><span style="font-weight:700;color:var(--primary)">BK00${b.booking_id}</span></td><td>${statusBadge(b.status)}</td><td style="font-weight:700">${formatCurrency(b.amount)}</td></tr>`).join('');

const emojis={'Paris, France':'🗼','Tokyo, Japan':'🗾','Swiss Alps':'🏔','New York, USA':'🗽','Bali, Indonesia':'🏝','Dubai, UAE':'🏗','Goa, India':'🏖'};

// Mini Trips
document.getElementById('trips-mini-container').innerHTML = DB.trips.slice(0,4).map(t=>`<div class="trip-card"><div class="trip-img-placeholder">${emojis[t.destination]||'✈'}</div><div class="trip-info"><div class="trip-name">${t.destination}</div><div class="trip-date">📅 ${formatDate(t.start_date)} - ${formatDate(t.end_date)}</div></div>${statusBadge(t.status)}</div>`).join('');

// Mini Reviews
const reviews = [...DB.reviews].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
document.getElementById('reviews-mini').innerHTML = reviews.map(r => {
  const trip = DB.trips.find(t => t.trip_id === r.trip_id);
  const traveler = DB.travelers.find(tr => tr.traveler_id === r.traveler_id);
  return `
    <div style="padding:12px 0;border-bottom:1px solid var(--border-light)">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="color:#d97706;font-weight:700;font-size:13px">${'⭐'.repeat(r.trip_rating)}</span>
        <span style="font-size:11px;color:var(--text-muted)">${r.created_at}</span>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--text-primary)">${trip ? trip.destination : 'Unknown Trip'}</div>
      <div style="font-size:12px;color:var(--text-muted)">Reviewed by: ${traveler ? traveler.name : 'Unknown Traveler'}</div>
    </div>
  `;
}).join('') || '<div class="empty-state" style="padding:20px 0">No reviews yet.</div>';

showToast(`Welcome, ${user.name}! (Admin Access)`);
