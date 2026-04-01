if (!Auth.isLoggedIn() || Auth.getRole() !== 'traveler') window.location.href = '../traveler-login.html';
const user = Auth.getUser();

function renderTrips() {
  const search = document.getElementById('trip-search').value.toLowerCase();
  const statusFilter = document.getElementById('status-filter').value;
  let trips = DB.trips.filter(t => t.traveler_id === user.traveler_id);
  if (search) trips = trips.filter(t => t.destination.toLowerCase().includes(search));
  if (statusFilter) trips = trips.filter(t => t.status === statusFilter);
  const container = document.getElementById('trips-container');
  if (trips.length === 0) {
    container.innerHTML = `<div class="empty-state card"><div class="empty-icon">🗺</div><h3>No trips found</h3><p>Start planning your next adventure!</p><button class="btn btn-primary" onclick="openModal('add-trip-modal')">+ Create Trip</button></div>`;
    return;
  }
  container.innerHTML = trips.map(t => {
    const itins = DB.itineraries.filter(i => i.trip_id === t.trip_id);
    const days = [...new Set(itins.map(i => i.day_number))].sort();
    const guide = DB.travelGuides.find(g => g.guide_id === t.guide_id);
    const tripImg = getDestImg(t.destination);
    return `
    <div class="trip-detail-card">
      <div class="trip-header">
        <div class="trip-emoji" style="background:url('${tripImg}') center/cover no-repeat; border:none; width:80px; height:80px"></div>
        <div style="flex:1">
          <div class="trip-dest-title">📍 ${t.destination}</div>
          <div style="display:flex;gap:8px;margin:4px 0">
            <span style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;color:var(--text-muted);font-weight:700">Trip: TR00${t.trip_id}</span>
            <span style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;color:var(--text-muted);font-weight:700">Traveler: TL00${t.traveler_id}</span>
          </div>
          <div class="trip-dates-text">📅 ${formatDate(t.start_date)} - ${formatDate(t.end_date)}</div>
          ${guide ? `<div style="font-size:13px;color:var(--text-muted);margin-top:2px">👤 Guide: ${guide.name}</div>` : ''}
        </div>
        <div style="text-align:right">
          ${statusBadge(t.status)}
          <div style="font-size:13px;color:var(--text-muted);margin-top:8px">Cost: <strong>${formatCurrency(t.budget)}</strong></div>
          ${(DB.reviews.find(r => r.trip_id === t.trip_id)) ? `<div class="review-tag">★ Reviewed</div>` : ''}
        </div>
      </div>

      <!-- ACTION BAR -->
      <div class="trip-actions-row">
        <button class="btn btn-grad" onclick="editTrip(${t.trip_id})">✎ Modify Trip</button>
        <button class="btn btn-outline-yel" onclick="location.href='bookings.html'">🚌 Book Transport</button>
        <button class="btn btn-outline-org" onclick="location.href='bookings.html'">🏨 Book Stay</button>
        ${(t.status === 'Confirmed' || t.status === 'Completed') && !DB.reviews.find(r => r.trip_id === t.trip_id) ? 
          `<button class="btn btn-primary" style="background:#fbbf24;border:none;color:#92400e" onclick="openReviewModal(${t.trip_id}, ${t.guide_id || 'null'})">⭐ Rate Trip</button>` : ''}
        <button class="btn btn-outline-red" style="margin-left:auto" onclick="openCancel(${t.trip_id})">✕ Cancel Trip</button>
      </div>

      <!-- SUMMARY BOXES -->
      <div class="summary-boxes">
        <div class="sum-box">
          <div class="sum-label">✓ Completed</div>
          <div class="sum-val blue">${itins.filter(i=>i.activity_status==='Completed').length}</div>
        </div>
        <div class="sum-box">
          <div class="sum-label">✅ Confirmed</div>
          <div class="sum-val green">${itins.filter(i=>i.activity_status==='Confirmed').length}</div>
        </div>
        <div class="sum-box">
          <div class="sum-label">⏳ Pending</div>
          <div class="sum-val org">${itins.filter(i=>i.activity_status==='Pending').length}</div>
        </div>
      </div>

      <!-- ITINERARY & MAP SECTIONS -->
      <div class="trip-sections">
        <div>
          <div style="font-weight:700;font-size:16px;margin-bottom:16px;color:var(--text-primary);display:flex;justify-content:space-between">
            <span>📅 Trip Itinerary</span>
            <button onclick="openAddActivity(${t.trip_id})" class="btn btn-secondary btn-sm">+ Add Activity</button>
          </div>
          ${days.length === 0 ? `<div class="empty-state" style="padding:24px"><div class="empty-icon">📋</div><p>No activities yet.</p></div>` :
            days.map(day => {
              const dayItins = itins.filter(i => i.day_number === day);
              return `<div class="itinerary-day">
                <div class="day-header"><span>Day ${day}</span><span style="color:#d97706">${dayItins.length} events</span></div>
                ${dayItins.map(i => `
                  <div class="activity-row">
                    <div class="activity-time-badge">${i.time || '--:--'}</div>
                    <div class="activity-name">${i.activity}</div>
                    ${statusBadge(i.activity_status)}
                    <button onclick="deleteActivity(${i.itinerary_id}, ${t.trip_id})" class="btn btn-danger btn-sm btn-icon" style="padding:4px 8px;font-size:10px">✖</button>
                  </div>`).join('')}
              </div>`;
            }).join('')}
        </div>
        
        <div>
           <div style="font-weight:700;font-size:16px;margin-bottom:16px;color:var(--text-primary)">📍 Location</div>
           <div class="map-placeholder">
             <div>🗺️</div>
             <div style="font-size:14px;margin-top:8px">Map View</div>
           </div>
           
           <div style="font-weight:700;font-size:16px;margin-top:24px;margin-bottom:12px;color:var(--text-primary)">Booking Summary</div>
           <div style="background:#f8fafc;padding:16px;border-radius:12px;font-size:14px;color:var(--text-secondary)">
              <div style="margin-bottom:8px">✈️ Air France XY123 - <span style="color:#10b981">Confirmed</span></div>
              <div style="margin-bottom:8px">🏨 Hotel Lumiere - <span style="color:#10b981">Confirmed</span></div>
              <div>🎫 Metro Pass - <span style="color:#f59e0b">Pending</span></div>
           </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// Search
document.getElementById('trip-search').addEventListener('input', renderTrips);

// Populate packages
function populatePackages() {
  const sel = document.getElementById('t-package');
  sel.innerHTML = '<option value="">-- No Package --</option>' +
    DB.packageTrips.map(p => `<option value="${p.package_id}">${p.name} (${p.duration} days, ${formatCurrency(p.budget)})</option>`).join('');
}

document.getElementById('t-type').addEventListener('change', function() {
  document.getElementById('package-group').style.display = this.value === 'package' ? 'block' : 'none';
});

// Add/Edit Trip
function editTrip(id) {
  const t = DB.trips.find(t => t.trip_id === id);
  document.getElementById('trip-modal-title').textContent = 'Edit Trip';
  document.getElementById('edit-trip-id').value = id;
  document.getElementById('t-dest').value = t.destination;
  document.getElementById('t-start').value = t.start_date;
  document.getElementById('t-end').value = t.end_date;
  document.getElementById('t-type').value = t.package_id ? 'package' : 'custom';
  document.getElementById('package-group').style.display = t.package_id ? 'block' : 'none';
  if (t.package_id) document.getElementById('t-package').value = t.package_id;
  openModal('add-trip-modal');
}

function saveTrip(e) {
  e.preventDefault();
  if (!validateForm('trip-form')) return;
  const start = document.getElementById('t-start').value;
  const end = document.getElementById('t-end').value;
  if (end <= start) { document.getElementById('t-end').classList.add('error'); document.getElementById('t-end-error').textContent = 'End date must be after start date'; document.getElementById('t-end-error').classList.add('show'); return; }
  const id = document.getElementById('edit-trip-id').value;
  const days = Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000));
  const estimatedCost = 23500 + (days * 6000); // Base (Transport+Guide+Fee) + ₹6,000/day Hotel
  const tripData = {
    destination: document.getElementById('t-dest').value,
    budget: estimatedCost,
    start_date: start, end_date: end,
    traveler_id: user.traveler_id,
    guide_id: 1,
    package_id: document.getElementById('t-type').value === 'package' ? parseInt(document.getElementById('t-package').value) || null : null,
    status: 'Planning'
  };
  if (id) {
    const idx = DB.trips.findIndex(t => t.trip_id === parseInt(id));
    DB.trips[idx] = { ...DB.trips[idx], ...tripData };
    showToast('Trip updated successfully!');
  } else {
    tripData.trip_id = generateId(DB.trips, 'trip_id');
    DB.trips.push(tripData);
    showToast('Trip created successfully!');
  }
  saveDB();
  closeModal('add-trip-modal');
  document.getElementById('edit-trip-id').value = '';
  document.getElementById('trip-modal-title').textContent = 'Add New Trip';
  document.getElementById('trip-form').reset();
  renderTrips();
}

// Activities
function openAddActivity(tripId) {
  document.getElementById('act-trip-id').value = tripId;
  document.getElementById('activity-form').reset();
  openModal('activity-modal');
}

function saveActivity(e) {
  e.preventDefault();
  if (!validateForm('activity-form')) return;
  const tripId = parseInt(document.getElementById('act-trip-id').value);
  const newAct = {
    itinerary_id: generateId(DB.itineraries, 'itinerary_id'),
    trip_id: tripId,
    city: document.getElementById('act-location').value || '',
    day_number: parseInt(document.getElementById('act-day').value),
    activity: document.getElementById('act-title').value,
    activity_status: document.getElementById('act-status').value,
    time: document.getElementById('act-time').value
  };
  DB.itineraries.push(newAct);
  saveDB();
  closeModal('activity-modal');
  showToast('Activity added!');
  renderTrips();
}

function deleteActivity(id, tripId) {
  confirmDelete('Delete this activity?', () => {
    const idx = DB.itineraries.findIndex(i => i.itinerary_id === id);
    DB.itineraries.splice(idx, 1);
    saveDB();
    showToast('Activity deleted', 'error');
    renderTrips();
  });
}

// REVIEWS
function openReviewModal(tripId, guideId) {
  document.getElementById('rev-trip-id').value = tripId;
  document.getElementById('rev-guide-id').value = guideId || '';
  document.getElementById('guide-rating-section').style.display = guideId ? 'block' : 'none';
  document.getElementById('rating-form').reset();
  openModal('rating-modal');
}

function submitReview(e) {
  e.preventDefault();
  const tripId = parseInt(document.getElementById('rev-trip-id').value);
  const guideId = document.getElementById('rev-guide-id').value ? parseInt(document.getElementById('rev-guide-id').value) : null;
  
  const trip = DB.trips.find(t => t.trip_id === tripId);
  
  const tripRating = document.querySelector('input[name="trip-rating"]:checked');
  const guideRating = document.querySelector('input[name="guide-rating"]:checked');
  const comment = document.getElementById('rev-comment').value.trim();
  
  if (!tripRating) { showToast('Please rate your trip!', 'error'); return; }
  if (guideId && !guideRating) { showToast('Please rate your guide!', 'error'); return; }
  
  const newReview = {
    review_id: generateId(DB.reviews, 'review_id'),
    trip_id: tripId,
    traveler_id: user.traveler_id,
    guide_id: guideId,
    trip_rating: parseInt(tripRating.value),
    guide_rating: guideId ? parseInt(guideRating.value) : null,
    comment: comment,
    created_at: new Date().toISOString().split('T')[0]
  };
  
  DB.reviews.push(newReview);
  
  // Add Notification for admin
  addNotif('admin', 'info', '⭐', 'New Review', `${user.name} just rated their trip to ${trip.destination} ${newReview.trip_rating}/5 stars.`);
  
  saveDB();
  
  // Close modal immediately
  closeModal('rating-modal');
  
  // Show detailed Success Toast
  showToast(`🎉 Thank You! Your review for Trip TR00${tripId} has been submitted.`);
  
  // Refresh UI
  renderTrips();
}

// Cancel trip
function openCancel(id) {
  document.getElementById('cancel-trip-id').value = id;
  openModal('cancel-modal');
}

function confirmCancel() {
  const id = parseInt(document.getElementById('cancel-trip-id').value);
  const idx = DB.trips.findIndex(t => t.trip_id === id);
  DB.trips[idx].status = 'Cancelled';
  saveDB();
  closeModal('cancel-modal');
  showToast('Trip cancelled', 'error');
  renderTrips();
}

// Init
populatePackages();
setupLiveValidation('trip-form');
setupLiveValidation('activity-form');
renderTrips();
