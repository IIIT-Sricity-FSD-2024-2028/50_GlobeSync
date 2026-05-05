if (!Auth.isLoggedIn() || Auth.getRole() !== 'traveler') window.location.href = '../traveler-login.html';
const user = Auth.getUser();
const uid = getUserId();

// In-memory caches to avoid repeated API calls during rendering
let _trips = [];
let _itineraries = {};   // tripId -> itinerary[]
let _guides = [];
let _reviews = [];
let _packages = [];

async function fetchData() {
  try {
    [_trips, _guides, _packages] = await Promise.all([
      apiGetSnake(`/trips/traveler/${uid}`),
      apiGetSnake('/guides'),
      apiGetSnake('/packages'),
    ]);
    // Load itineraries and reviews for each trip
    const itinPromises = _trips.map(t => apiGetSnake(`/itineraries/trip/${t.trip_id}`).catch(() => []));
    const revPromises  = _trips.map(t => apiGetSnake(`/reviews/trip/${t.trip_id}`).then(res => Array.isArray(res) ? res : (res.value || [])).catch(() => []));
    const itinResults = await Promise.all(itinPromises);
    const revResults  = await Promise.all(revPromises);
    _trips.forEach((t, i) => { _itineraries[t.trip_id] = itinResults[i]; });
    _reviews = revResults.flat();
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}

async function renderTrips() {
  const search = document.getElementById('trip-search').value.toLowerCase();
  const statusFilter = document.getElementById('status-filter').value;
  let trips = [..._trips];
  if (search) trips = trips.filter(t => t.destination.toLowerCase().includes(search));
  if (statusFilter) trips = trips.filter(t => t.status === statusFilter);
  const container = document.getElementById('trips-container');
  if (trips.length === 0) {
    container.innerHTML = `<div class="empty-state card"><div class="empty-icon">🗺</div><h3>No trips found</h3><p>Start planning your next adventure!</p><button class="btn btn-primary" onclick="openModal('add-trip-modal')">+ Create Trip</button></div>`;
    return;
  }
  container.innerHTML = trips.map(t => {
    const itins = _itineraries[t.trip_id] || [];
    const days = [...new Set(itins.map(i => i.day_number))].sort();
    const guide = _guides.find(g => g.guide_id === t.guide_id);
    const tripImg = getDestImg(t.destination);
    const hasReview = _reviews.find(r => r.trip_id === t.trip_id);
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
          ${!guide && t.status === 'Planning' ? `<button onclick="openGuideSelection(${t.trip_id})" class="btn btn-sm" style="background:var(--primary);color:#fff;border:none;margin-top:8px;width:100%">🔍 Select Guide</button>` : ''}
          ${hasReview ? `<div class="review-tag">★ Reviewed</div>` : ''}
        </div>
      </div>

      <!-- ACTION BAR -->
      <div class="trip-actions-row">
        <button class="btn btn-primary" onclick="editTrip(${t.trip_id})">✎ Modify Trip</button>
        <button class="btn btn-outline-yel" onclick="location.href='bookings.html'">🚌 Book Transport</button>
        <button class="btn btn-outline-org" onclick="location.href='bookings.html'">🏨 Book Stay</button>
        ${(t.status === 'Confirmed' || t.status === 'Completed') && !hasReview ?
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
           <div class="map-placeholder" style="padding:0; border:none; overflow:hidden;">
             <iframe width="100%" height="100%" style="border:0;" loading="lazy" allowfullscreen src="https://maps.google.com/maps?q=${encodeURIComponent(t.destination)}&t=&z=13&ie=UTF8&iwloc=&output=embed"></iframe>
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
document.getElementById('trip-search').addEventListener('input', () => renderTrips());

// Populate packages dropdown
async function populatePackages() {
  const sel = document.getElementById('t-package');
  sel.innerHTML = '<option value="">-- No Package --</option>' +
    _packages.map(p => `<option value="${p.package_id}">${p.title || p.name} (${p.duration} days, ${formatCurrency(p.budget)})</option>`).join('');
}

document.getElementById('t-type').addEventListener('change', function() {
  document.getElementById('package-group').style.display = this.value === 'package' ? 'block' : 'none';
});

// Add/Edit Trip
function editTrip(id) {
  const t = _trips.find(t => t.trip_id === id);
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

async function saveTrip(e) {
  e.preventDefault();
  if (!validateForm('trip-form')) return;
  const start = document.getElementById('t-start').value;
  const end = document.getElementById('t-end').value;
  if (end <= start) { document.getElementById('t-end').classList.add('error'); document.getElementById('t-end-error').textContent = 'End date must be after start date'; document.getElementById('t-end-error').classList.add('show'); return; }
  const id = document.getElementById('edit-trip-id').value;
  const days = Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000));
  const estimatedCost = 23500 + (days * 6000);
  const randomGuide = _guides.length > 0 ? _guides[Math.floor(Math.random() * _guides.length)] : null;

  const tripData = {
    destination: document.getElementById('t-dest').value,
    budget: estimatedCost,
    start_date: start, end_date: end,
    traveler_id: uid,
    guide_id: randomGuide ? randomGuide.guide_id : null,
    package_id: document.getElementById('t-type').value === 'package' ? parseInt(document.getElementById('t-package').value) || null : null,
    status: 'Planning'
  };

  try {
    if (id) {
      await apiPutSnake(`/trips/${id}`, tripData);
      showToast('Trip updated successfully!');
    } else {
      const newTrip = await apiPostSnake('/trips', tripData);

      // Create default bookings
      await apiPostSnake('/bookings', { traveler_id: uid, trip_id: newTrip.trip_id, service: `Flight to ${tripData.destination}`, type: 'Flight', booking_date: new Date().toISOString().split('T')[0], status: 'Pending', amount: Math.round(tripData.budget * 0.35) });
      await apiPostSnake('/bookings', { traveler_id: uid, trip_id: newTrip.trip_id, service: `Hotel in ${tripData.destination}`, type: 'Hotel', booking_date: new Date().toISOString().split('T')[0], status: 'Pending', amount: Math.round(tripData.budget * 0.45) });

      if (randomGuide) {
        await apiPost('/messages', { sender: 'traveler', senderId: uid, receiver: 'guide', receiverId: randomGuide.guide_id, content: `Hi! I've just requested you as my guide for a new trip to ${tripData.destination} (${formatDate(tripData.start_date)} - ${formatDate(tripData.end_date)}). Looking forward to planning this with you!` });
      }
      showToast(`Trip created successfully!`);
    }
    closeModal('add-trip-modal');
    document.getElementById('edit-trip-id').value = '';
    document.getElementById('trip-modal-title').textContent = 'Add New Trip';
    document.getElementById('trip-form').reset();
    await fetchData();
    renderTrips();
  } catch (e) {
    console.error('Failed to save trip:', e);
  }
}

// Activities
function openAddActivity(tripId) {
  document.getElementById('act-trip-id').value = tripId;
  document.getElementById('activity-form').reset();
  openModal('activity-modal');
}

async function saveActivity(e) {
  e.preventDefault();
  if (!validateForm('activity-form')) return;
  const tripId = parseInt(document.getElementById('act-trip-id').value);
  try {
    await apiPostSnake('/itineraries', {
      trip_id: tripId,
      city: document.getElementById('act-location').value || '',
      day_number: parseInt(document.getElementById('act-day').value),
      activity: document.getElementById('act-title').value,
      activity_status: document.getElementById('act-status').value,
      time: document.getElementById('act-time').value
    });
    closeModal('activity-modal');
    showToast('Activity added!');
    await fetchData();
    renderTrips();
  } catch (e) {
    console.error('Failed to save activity:', e);
  }
}

async function deleteActivity(id, tripId) {
  confirmDelete('Delete this activity?', async () => {
    try {
      await apiDeleteSnake(`/itineraries/${id}`);
      showToast('Activity deleted', 'error');
      await fetchData();
      renderTrips();
    } catch (e) {
      console.error('Failed to delete activity:', e);
    }
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

async function submitReview(e) {
  e.preventDefault();
  const tripId = parseInt(document.getElementById('rev-trip-id').value);
  const guideId = document.getElementById('rev-guide-id').value ? parseInt(document.getElementById('rev-guide-id').value) : null;

  const tripRating = document.querySelector('input[name="trip-rating"]:checked');
  const guideRating = document.querySelector('input[name="guide-rating"]:checked');
  const comment = document.getElementById('rev-comment').value.trim();

  if (!tripRating) { showToast('Please rate your trip!', 'error'); return; }
  if (guideId && !guideRating) { showToast('Please rate your guide!', 'error'); return; }

  try {
    await apiPostSnake('/reviews', {
      trip_id: tripId,
      traveler_id: uid,
      guide_id: guideId || 1,
      trip_rating: parseInt(tripRating.value),
      guide_rating: guideId ? parseInt(guideRating.value) : parseInt(tripRating.value),
      comment: comment,
      created_at: new Date().toISOString().split('T')[0]
    });

    closeModal('rating-modal');
    showToast(`🎉 Thank You! Your review for Trip TR00${tripId} has been submitted.`);
    await fetchData();
    renderTrips();
  } catch (e) {
    console.error('Failed to submit review:', e);
  }
}

// Cancel trip
function openCancel(id) {
  document.getElementById('cancel-trip-id').value = id;
  openModal('cancel-modal');
}

async function confirmCancel() {
  const id = parseInt(document.getElementById('cancel-trip-id').value);
  try {
    await apiPatchSnake(`/trips/${id}/status`, { status: 'Cancelled' });
    closeModal('cancel-modal');
    showToast('Trip cancelled', 'error');
    await fetchData();
    renderTrips();
  } catch (e) {
    console.error('Failed to cancel trip:', e);
  }
}

// GUIDE SELECTION
function openGuideSelection(tripId) {
  const container = document.getElementById('guide-list-container');
  container.innerHTML = _guides.map(g => `
    <div class="guide-card-mini" onclick="selectGuide(${tripId}, ${g.guide_id})">
      <div class="guide-avatar-mini">${g.name[0]}</div>
      <div class="guide-info-mini">
        <div class="guide-name-mini">${g.name}</div>
        <div class="guide-meta-mini">⭐ ${g.rating} • ${g.experience}yr exp</div>
      </div>
      <div style="color:var(--primary);font-weight:700;font-size:12px">Select →</div>
    </div>
  `).join('');
  openModal('guide-modal');
}

async function selectGuide(tripId, guideId) {
  const trip = _trips.find(t => t.trip_id === tripId);
  const guide = _guides.find(g => g.guide_id === guideId);
  if (trip && guide) {
    try {
      await apiPutSnake(`/trips/${tripId}`, { ...trip, guide_id: guideId, status: 'Planning' });
      await apiPost('/messages', { sender: 'traveler', senderId: uid, receiver: 'guide', receiverId: guideId, content: `Hi! I've just requested you as my guide for a new trip to ${trip.destination} (${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}). Looking forward to planning this with you!` });
      closeModal('guide-modal');
      showToast(`Request sent to ${guide.name}!`);
      await fetchData();
      renderTrips();
    } catch (e) {
      console.error('Failed to select guide:', e);
    }
  }
}

// Init
(async () => {
  await fetchData();
  populatePackages();
  setupLiveValidation('trip-form');
  setupLiveValidation('activity-form');
  renderTrips();
})();
