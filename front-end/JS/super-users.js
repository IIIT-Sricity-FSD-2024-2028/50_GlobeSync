if (!Auth.isLoggedIn() || Auth.getRole() !== 'superuser') window.location.href = '../super-login.html';

// Build unified user list
function getAllUsers() {
  const travelers = DB.travelers.map(t => ({ id: `T${t.traveler_id}`, name: t.name, role: 'Traveler', email: t.email, phone: t.phone, status: 'Active', raw: t, rawType: 'traveler' }));
  const guides = DB.travelGuides.map(g => ({ id: `G${g.guide_id}`, name: g.name, role: 'Guide', email: g.contact, phone: g.contact, status: 'Active', raw: g, rawType: 'guide' }));
  const support = DB.customerCare.map(c => ({ id: `S${c.care_id}`, name: c.name, role: 'Support', email: c.email || `${c.name.toLowerCase().replace(' ','.')}@globesync.com`, phone: c.contact, status: 'Active', raw: c, rawType: 'support' }));
  const admins = DB.administrators.filter(a => a.role === 'admin').map(a => ({ id: `A${a.admin_id}`, name: a.name, role: 'Admin', email: a.email, phone: a.phone || 'N/A', status: 'Active', raw: a, rawType: 'admin' }));
  return [...travelers, ...guides, ...support, ...admins];
}

function renderUsers() {
  const search = document.getElementById('user-search').value.toLowerCase();
  const roleF = document.getElementById('role-filter').value;
  const statusF = document.getElementById('status-filter').value;
  let users = getAllUsers();
  if (search) users = users.filter(u => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search) || u.id.toLowerCase().includes(search));
  if (roleF) users = users.filter(u => u.role === roleF);
  if (statusF) users = users.filter(u => u.status === statusF);
  const tbody = document.getElementById('users-tbody');
  const empty = document.getElementById('empty-users');
  if (users.length === 0) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><span style="font-weight:700;color:var(--primary)">${u.id}</span></td>
      <td><div style="display:flex;align-items:center;gap:10px"><div style="width:32px;height:32px;border-radius:50%;background:var(--gradient);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;flex-shrink:0">${u.name[0]}</div><div style="font-weight:600">${u.name}</div></div></td>
      <td><span class="badge ${u.role==='Traveler'?'badge-pink':u.role==='Guide'?'badge-warning':u.role==='Admin'?'badge-info':'badge-success'}">${u.role}</span></td>
      <td style="color:var(--text-secondary);font-size:13px">${u.email}</td>
      <td>${statusBadge(u.status)}</td>
      <td><div style="display:flex;gap:6px">
        <button onclick="viewUser('${u.id}')" class="btn btn-secondary btn-sm" style="background:#f1f5f9;border:none">👁</button>
        <button onclick="editUser('${u.id}')" class="btn btn-secondary btn-sm" style="background:transparent;border:1px solid #cbd5e1">✏ Edit</button>
        <button onclick="deleteUser('${u.id}')" class="btn btn-danger btn-sm" style="background:transparent;border:1px solid #fecaca;color:#ef4444">🗑 Delete</button>
      </div></td>
    </tr>`).join('');
}

function toggleRoleFields() {
  const role = document.getElementById('u-role').value;
  document.getElementById('admin-fields').style.display = role === 'Admin' ? 'block' : 'none';
  document.getElementById('traveler-fields').style.display = role === 'Traveler' ? 'block' : 'none';
  document.getElementById('guide-fields').style.display = role === 'Guide' ? 'block' : 'none';
}

function openAddUser() {
  document.getElementById('user-modal-title').textContent = 'Add New User';
  document.getElementById('edit-user-id').value = '';
  document.getElementById('user-form').reset();
  toggleRoleFields();
  openModal('user-modal');
}

function editUser(id) {
  const users = getAllUsers();
  const u = users.find(u => u.id === id);
  document.getElementById('user-modal-title').textContent = 'Edit User';
  document.getElementById('edit-user-id').value = id;
  document.getElementById('edit-user-role-type').value = u.rawType;
  document.getElementById('u-name').value = u.name;
  document.getElementById('u-email').value = u.email;
  document.getElementById('u-phone').value = u.phone || '';
  document.getElementById('u-role').value = u.role;
  document.getElementById('u-status').value = u.status;
  document.getElementById('u-password').value = '********';
  document.getElementById('u-confirm').value = '********';
  toggleRoleFields();
  if (u.rawType === 'guide') { document.getElementById('u-language').value = u.raw.language || ''; document.getElementById('u-experience').value = u.raw.experience || ''; }
  if (u.rawType === 'traveler') { document.getElementById('u-gender').value = u.raw.gender || ''; document.getElementById('u-age').value = u.raw.age || ''; }
  if (u.rawType === 'admin') { document.getElementById('u-region').value = u.raw.region || ''; }
  openModal('user-modal');
}

function viewUser(id) {
  const users = getAllUsers();
  const u = users.find(u => u.id === id);
  document.getElementById('view-user-content').innerHTML = `
    <div style="padding:4px 0;display:flex;flex-direction:column;gap:12px">
      <div style="text-align:center;padding:16px 0"><div style="width:60px;height:60px;border-radius:50%;background:var(--gradient);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:700;margin:0 auto 12px">${u.name[0]}</div><div style="font-weight:700;font-size:18px">${u.name}</div>${statusBadge(u.status)}</div>
      <div class="flex-between"><span style="color:var(--text-muted)">User ID</span><span style="font-weight:700;color:var(--primary)">${u.id}</span></div>
      <div class="flex-between"><span style="color:var(--text-muted)">Role</span><span class="badge ${u.role==='Traveler'?'badge-pink':u.role==='Guide'?'badge-warning':'badge-success'}">${u.role}</span></div>
      <div class="flex-between"><span style="color:var(--text-muted)">Email</span><span>${u.email}</span></div>
      <div class="flex-between"><span style="color:var(--text-muted)">Phone</span><span>${u.phone||'N/A'}</span></div>
      ${u.rawType==='guide'?`<div class="flex-between"><span style="color:var(--text-muted)">Language</span><span>${u.raw.language}</span></div><div class="flex-between"><span style="color:var(--text-muted)">Experience</span><span>${u.raw.experience} years</span></div>`:''}
      ${u.rawType==='traveler'?`<div class="flex-between"><span style="color:var(--text-muted)">Gender</span><span>${u.raw.gender||'N/A'}</span></div><div class="flex-between"><span style="color:var(--text-muted)">Age</span><span>${u.raw.age||'N/A'}</span></div>`:''}
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('view-user-modal')">Close</button><button class="btn btn-primary" style="background:var(--gradient)" onclick="closeModal('view-user-modal');editUser('${u.id}')">Edit User</button></div>`;
  openModal('view-user-modal');
}

function saveUser(e) {
  e.preventDefault();
  const id = document.getElementById('edit-user-id').value;
  // Skip password match check if editing (placeholder)
  if (!id || document.getElementById('u-password').value !== '********') {
    if (!validateForm('user-form')) return;
  } else {
    // Just validate name, email, role
    let valid = true;
    ['u-name','u-email','u-role'].forEach(fid => {
      const el = document.getElementById(fid);
      if (!el.value.trim()) { el.classList.add('error'); valid = false; }
      else el.classList.remove('error');
    });
    if (!valid) { showToast('Please fill required fields', 'error'); return; }
  }
  const role = document.getElementById('u-role').value;
  const name = document.getElementById('u-name').value;
  const email = document.getElementById('u-email').value;
  const phone = document.getElementById('u-phone').value;
  if (id) {
    // Update existing
    const rawType = document.getElementById('edit-user-role-type').value;
    if (rawType === 'traveler') {
      const numId = parseInt(id.slice(1));
      const idx = DB.travelers.findIndex(t => t.traveler_id === numId);
      if (idx >= 0) { DB.travelers[idx].name = name; DB.travelers[idx].email = email; DB.travelers[idx].phone = phone; }
    } else if (rawType === 'guide') {
      const numId = parseInt(id.slice(1));
      const idx = DB.travelGuides.findIndex(g => g.guide_id === numId);
      if (idx >= 0) { DB.travelGuides[idx].name = name; DB.travelGuides[idx].language = document.getElementById('u-language').value; }
    } else if (rawType === 'support') {
      const numId = parseInt(id.slice(1));
      const idx = DB.customerCare.findIndex(c => c.care_id === numId);
      if (idx >= 0) { DB.customerCare[idx].name = name; DB.customerCare[idx].contact = phone; }
    }
    showToast('User updated successfully!');
  } else {
    // Add new
    if (role === 'Traveler') {
      DB.travelers.push({ traveler_id: generateId(DB.travelers,'traveler_id'), name, email, phone, gender: document.getElementById('u-gender').value, age: parseInt(document.getElementById('u-age').value)||0, password: document.getElementById('u-password').value });
    } else if (role === 'Guide') {
      DB.travelGuides.push({ guide_id: generateId(DB.travelGuides,'guide_id'), name, contact: phone, language: document.getElementById('u-language').value, experience: parseInt(document.getElementById('u-experience').value)||0, admin_id: 1, password: document.getElementById('u-password').value });
    } else if (role === 'Support') {
      DB.customerCare.push({ care_id: generateId(DB.customerCare,'care_id'), name, contact: phone, email, password: document.getElementById('u-password').value, role: 'support' });
    } else if (role === 'Admin') {
      DB.administrators.push({ admin_id: generateId(DB.administrators,'admin_id'), name, email, password: document.getElementById('u-password').value, role: 'admin', region: document.getElementById('u-region').value });
    }
    showToast('User added successfully!');
  }
  closeModal('user-modal');
  document.getElementById('user-form').reset();
  document.getElementById('edit-user-id').value = '';
  saveDB();
  renderUsers();
}

function deleteUser(id) {
  confirmDelete(`Delete user ${id}? This action cannot be undone.`, () => {
    const rawType = id[0];
    const numId = parseInt(id.slice(1));
    if (rawType === 'T') DB.travelers.splice(DB.travelers.findIndex(t => t.traveler_id === numId), 1);
    else if (rawType === 'G') DB.travelGuides.splice(DB.travelGuides.findIndex(g => g.guide_id === numId), 1);
    else if (rawType === 'S') DB.customerCare.splice(DB.customerCare.findIndex(c => c.care_id === numId), 1);
    else if (rawType === 'A') DB.administrators.splice(DB.administrators.findIndex(a => a.admin_id === numId), 1);
    showToast('User deleted', 'error');
    saveDB();
    renderUsers();
  });
}

document.getElementById('user-search').addEventListener('input', renderUsers);
setupLiveValidation('user-form');
renderUsers();
// Inject notifications
if (typeof injectNotifBell === 'function') injectNotifBell('superuser');
