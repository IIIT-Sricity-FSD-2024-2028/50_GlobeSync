if (!Auth.isLoggedIn() || Auth.getRole() !== 'guide') window.location.href = '../login.html?role=guide';
const user = Auth.getUser();
const guideId = getUserId();
console.log('[guide-requests] Logged-in guide:', user);
console.log('[guide-requests] guideId:', guideId);

let _myTrips = [], _allTravelers = [];

async function loadData() {
  try {
    console.log('[guide-requests] Fetching /trips/guide/' + guideId);
    [_myTrips, _allTravelers] = await Promise.all([
      apiGetSnake(`/trips/guide/${guideId}`),
      apiGetSnake('/travelers')
    ]);
    console.log('[guide-requests] trips:', _myTrips.length, 'travelers:', _allTravelers.length);
    renderRequests();
  } catch (e) { console.error('[guide-requests] Failed to load requests:', e); }
}

function renderRequests() {
  const list = document.getElementById('requests-list');
  const search = document.getElementById('req-search').value.toLowerCase();
  const sort = document.getElementById('sort-filter').value;
  
  let requests = _myTrips.filter(t => t.status === 'Planning' || t.status === 'Pending');
  
  if (search) {
    requests = requests.filter(r => {
      const traveler = _allTravelers.find(tr => tr.traveler_id === r.traveler_id);
      return r.destination.toLowerCase().includes(search) || 
             (traveler && traveler.name.toLowerCase().includes(search));
    });
  }
  
  if (sort === 'budget-high') {
    requests.sort((a,b) => b.budget - a.budget);
  } else if (sort === 'oldest') {
    requests.sort((a,b) => new Date(a.start_date) - new Date(b.start_date));
  } else {
    requests.sort((a,b) => b.trip_id - a.trip_id);
  }

  document.getElementById('count-pending').textContent = requests.length;
  const acceptedCount = _myTrips.filter(t => t.status === 'Confirmed').length;
  document.getElementById('count-accepted').textContent = acceptedCount;

  if (requests.length === 0) {
    list.innerHTML = `
      <div class="empty-state card" style="padding:80px; text-align:center; background:#fff">
        <div style="font-size:64px; margin-bottom:20px">📭</div>
        <h3 style="font-size:24px; margin-bottom:12px">No New Requests</h3>
        <p style="color:var(--text-muted)">All caught up! New traveler requests will appear here when they are assigned to you.</p>
      </div>`;
    return;
  }

  list.innerHTML = requests.map(t => {
    const traveler = _allTravelers.find(tr => tr.traveler_id === t.traveler_id);
    
    return `
      <div class="request-card">
        <div class="req-traveler-avatar">${traveler ? traveler.name[0] : '?'}</div>
        <div class="req-info">
          <div class="req-header">
            <div>
              <div class="req-destination">📍 ${t.destination}</div>
              <div class="req-traveler-name">Requested by <strong>${traveler ? traveler.name : 'Unknown Traveler'}</strong></div>
            </div>
            <div style="text-align:right">
              <span class="badge" style="background:#fffbeb; color:#92400e; border:1px solid #fef3c7">New Request</span>
            </div>
          </div>
          <div class="req-details-grid">
            <div class="req-detail-item">
              <div class="req-detail-label">Dates</div>
              <div class="req-detail-val">📅 ${formatDate(t.start_date)} - ${formatDate(t.end_date)}</div>
            </div>
            <div class="req-detail-item">
              <div class="req-detail-label">Estimated Budget</div>
              <div class="req-detail-val">💰 ${formatCurrency(t.budget)}</div>
            </div>
            <div class="req-detail-item">
              <div class="req-detail-label">Traveler Code</div>
              <div class="req-detail-val">#TRV-${(t.traveler_id || 0).toString().padStart(4, '0')}</div>
            </div>
          </div>
        </div>
        <div class="req-actions">
          <button class="btn btn-primary" style="background:#10b981; border:none" onclick="acceptTrip(${t.trip_id})">✓ Accept Trip</button>
          <button class="btn btn-danger" style="background:#fff; color:#ef4444; border:1.5px solid #fee2e2" onclick="declineTrip(${t.trip_id})">✕ Decline</button>
          <button class="btn btn-secondary" onclick="location.href='messages.html?traveler=${t.traveler_id}'">💬 Message</button>
        </div>
      </div>
    `;
  }).join('');
}

async function acceptTrip(tripId) {
  try {
    await apiPatchSnake(`/trips/${tripId}/status`, { status: 'Confirmed' });
    
    const trip = _myTrips.find(t => t.trip_id === tripId);
    if (trip) {
      await apiPost('/messages', {
        sender: 'guide', senderId: guideId,
        receiver: 'traveler', receiverId: trip.traveler_id,
        content: `I've accepted your trip request for ${trip.destination}! Your trip is now confirmed. I'll start preparing your detailed itinerary. 🎉`
      });
    }

    showToast(`Trip #${tripId} accepted! ✓`);
    await loadData();
  } catch (e) { console.error('Failed to accept trip:', e); }
}

async function declineTrip(tripId) {
  if (!confirm('Are you sure you want to decline this trip request?')) return;
  try {
    const trip = _myTrips.find(t => t.trip_id === tripId);
    if (!trip) return;

    // Use apiPutSnake to update the entire trip, setting guide_id to null and status back to Planning
    await apiPutSnake(`/trips/${tripId}`, { ...trip, guide_id: null, status: 'Planning' });
    
    await apiPost('/messages', {
      sender: 'guide', senderId: guideId,
      receiver: 'traveler', receiverId: trip.traveler_id,
      content: `I'm sorry, but I won't be able to guide your trip to ${trip.destination} on those dates. Please feel free to select another guide. 🙏`
    });

    showToast(`Trip #${tripId} declined. Traveler notified.`, 'error');
    await loadData();
  } catch (e) { console.error('Failed to decline trip:', e); }
}

loadData();
