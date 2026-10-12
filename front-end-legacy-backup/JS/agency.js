// =========================
// AGENCY — Core JS Module
// Shared across all agency/ pages
// =========================

// ── Auth helpers ─────────────────────────────────────────────────────────────

function requireAgency() {
  if (Auth.getRole() !== 'agency') {
    window.location.href = '../agency-login.html';
  }
}

function getAgency() {
  return Auth.getUser();
}

function agencyLogout() {
  localStorage.removeItem('role');
  localStorage.removeItem('user');
  window.location.href = '../agency-login.html';
}

// ── Sidebar active nav ────────────────────────────────────────────────────────

function setAgencyNav(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

// ── Passengers CRUD ───────────────────────────────────────────────────────────

// ── Passengers CRUD ───────────────────────────────────────────────────────────

async function getMyPassengers(agencyId) {
  try {
    return await apiGetSnake(`/passengers/agency/${agencyId}`);
  } catch (e) {
    return [];
  }
}

async function addPassenger(agencyId, { name, age, gender, contact }) {
  const errors = {};
  if (!name.trim())          errors.name    = 'Name is required';
  if (!age || age < 1 || age > 120) errors.age  = 'Age must be between 1 and 120';
  if (!gender)               errors.gender  = 'Gender is required';

  if (Object.keys(errors).length) return { ok: false, errors };

  try {
    const passenger = await apiPostSnake('/passengers', {
      name: name.trim(), age: parseInt(age), gender, agency_id: agencyId
    });
    return { ok: true, passenger };
  } catch (e) {
    return { ok: false, errors: { global: e.message } };
  }
}

async function updatePassenger(passenger_id, agencyId, { name, age, gender, contact }) {
  const errors = {};
  if (!name.trim())          errors.name   = 'Name is required';
  if (!age || age < 1 || age > 120) errors.age = 'Age must be between 1 and 120';
  if (!gender)               errors.gender = 'Gender is required';
  if (Object.keys(errors).length) return { ok: false, errors };

  try {
    const passenger = await apiPatchSnake(`/passengers/${passenger_id}`, {
      name: name.trim(), age: parseInt(age), gender
    });
    return { ok: true, passenger };
  } catch (e) {
    return { ok: false, errors: { global: e.message } };
  }
}

async function deletePassenger(passenger_id, agencyId) {
  try {
    await apiDeleteSnake(`/passengers/${passenger_id}`);
    return true;
  } catch(e) {
    return false;
  }
}

// ── Bookings ──────────────────────────────────────────────────────────────────

async function getMyBookings(agencyId) {
  try {
    const trips = await apiGetSnake(`/trips/agency/${agencyId}`);
    return trips.map(t => ({
      packagebooking_id: t.trip_id,
      booking_date: t.start_date,
      status: t.status,
      package_id: t.package_id,
      start_date: t.start_date,
      end_date: t.end_date,
      destination: t.destination,
      guide_id: t.guide_id,
      trip_id: t.trip_id
    }));
  } catch (e) {
    return [];
  }
}

async function createAgencyBooking(agencyId, { package_id, passenger_id, start_date, end_date, notes }) {
  const errors = {};
  if (!package_id)   errors.package_id   = 'Please select a package';
  if (!passenger_id) errors.passenger_id = 'Please select a passenger';
  if (!start_date)   errors.start_date   = 'Start date is required';
  if (!end_date)     errors.end_date     = 'End date is required';
  if (start_date && end_date && start_date >= end_date) errors.end_date = 'End date must be after start date';
  if (Object.keys(errors).length) return { ok: false, errors };

  try {
    const pkg = await apiGetSnake(`/packages/${package_id}`);
    const booking = await apiPostSnake('/trips', {
      package_id: parseInt(package_id),
      agency_id: agencyId,
      destination: pkg.destinations,
      start_date,
      end_date,
      budget: pkg.budget,
      status: 'Confirmed'
    });
    return { ok: true, booking };
  } catch(e) {
    return { ok: false, errors: { global: e.message } };
  }
}

// ── Commission ledger ─────────────────────────────────────────────────────────

async function getMyLedger(agencyId) {
  try {
    const data = await apiGetSnake(`/dashboard/agency/${agencyId}`);
    return data.ledger || [];
  } catch(e) {
    return [];
  }
}

async function commissionSummary(agencyId) {
  try {
    const db = await apiGetSnake(`/dashboard/agency/${agencyId}`);
    return { 
      total: (db.pending_commission || 0) + (db.settled_commission || 0), 
      pending: db.pending_commission || 0, 
      settled: db.settled_commission || 0, 
      count: db.total_bookings || 0 
    };
  } catch(e) {
    return { total: 0, pending: 0, settled: 0, count: 0 };
  }
}

// ── Admin: agency approval ────────────────────────────────────────────────────

async function approveAgency(agency_id, commission_rate) {
  const rate = parseFloat(commission_rate);
  if (isNaN(rate) || rate < 0 || rate > 100) return { ok: false, error: 'Commission rate must be 0–100' };
  try {
    await apiPatchSnake(`/agencies/${agency_id}/status`, { status: 'approved', commission_rate: rate });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function rejectAgency(agency_id) {
  try {
    await apiPatchSnake(`/agencies/${agency_id}/status`, { status: 'rejected' });
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────

async function renderPassengerOptions(agencyId, selectedId) {
  const passengers = await getMyPassengers(agencyId);
  if (!passengers.length) return '<option value="">— No passengers added yet —</option>';
  return passengers.map(p =>
    `<option value="${p.pass_id}" ${p.pass_id == selectedId ? 'selected' : ''}>${p.name} (${p.gender}, ${p.age})</option>`
  ).join('');
}

async function renderPackageOptions(selectedId) {
  try {
    const packages = await apiGetSnake('/packages');
    return packages.map(p =>
      `<option value="${p.package_id}" ${p.package_id == selectedId ? 'selected' : ''}>${p.name} — ${formatCurrency(p.budget)}</option>`
    ).join('');
  } catch(e) {
    return '';
  }
}

function agencyStatusPill(status) {
  const cfg = {
    approved: { cls: 'badge-success', label: 'Approved' },
    pending:  { cls: 'badge-warning', label: 'Pending Approval' },
    rejected: { cls: 'badge-danger',  label: 'Rejected' }
  };
  const c = cfg[status] || { cls: 'badge-gray', label: status };
  return `<span class="badge ${c.cls}">${c.label}</span>`;
}

// ── Guide Selection ───────────────────────────────────────────────────────────

let _agencySelectingTripId = null;

async function openGuideSelection(tripId) {
  _agencySelectingTripId = tripId;
  const list = document.getElementById('guide-list-container');
  if(!list) return;
  
  try {
    const guides = await apiGetSnake('/guides');
    list.innerHTML = guides.map(g => {
      return `
        <div class="guide-card" style="padding:12px;border:1px solid var(--border-light);border-radius:8px;margin-bottom:12px;display:flex;align-items:center;gap:16px">
          <div style="width:48px;height:48px;border-radius:50%;background:var(--gradient-agency);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${g.name[0]}</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:15px">${g.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">⭐ ${g.rating || '4.5'} | ${g.language || 'English'}</div>
          </div>
          <button class="btn-agency" style="padding:6px 12px;font-size:12px" onclick="selectNewGuide(${g.guide_id})">Select</button>
        </div>`;
    }).join('');
    document.getElementById('guide-modal').style.display = 'flex';
  } catch (e) {
    console.error('Failed to load guides', e);
  }
}

async function selectNewGuide(guideId) {
  if(!_agencySelectingTripId) return;
  try {
    const agencyId = getAgency().agency_id || getAgency().agencyId;
    const trips = await getMyBookings(agencyId);
    const trip = trips.find(t => t.trip_id === _agencySelectingTripId || t.packagebooking_id === _agencySelectingTripId);
    
    if(trip) {
      await apiPatchSnake(`/trips/${_agencySelectingTripId}`, { guide_id: guideId, status: 'Pending' });
      await apiPost('/messages', { sender: 'agency', senderId: agencyId, receiver: 'guide', receiverId: guideId, content: `Hi! We've just assigned you as the guide for our trip to ${trip.destination}. Looking forward to it!` });
      showToast('Guide updated successfully! Trip is now Pending.');
      document.getElementById('guide-modal').style.display = 'none';
      if (typeof filterBookings === 'function') {
        const activeTab = document.querySelector('.tab.active');
        filterBookings(activeTab ? activeTab.textContent.trim() : 'All', activeTab);
      }
    }
  } catch(e) {
    console.error('Failed to select new guide', e);
  }
}

