if (!Auth.isLoggedIn() || Auth.getRole() !== 'superuser') window.location.href = '../super-login.html';

let _travelers = [], _guides = [], _allUsers = [];

async function loadAllUsers() {
  try {
    [_travelers, _guides] = await Promise.all([
      apiGetSnake('/travelers'),
      apiGetSnake('/guides')
    ]);
    buildUserList();
    renderUsers();
  } catch (e) { console.error('Failed to load users:', e); }
}

function buildUserList() {
  const travelers = _travelers.map(t => ({ id: `T${t.traveler_id}`, numId: t.traveler_id, name: t.name, role: 'Traveler', email: t.email, phone: t.phone || 'N/A', status: 'Active', raw: t, rawType: 'traveler' }));
  const guides = _guides.map(g => ({ id: `G${g.guide_id}`, numId: g.guide_id, name: g.name, role: 'Guide', email: g.email || 'N/A', phone: g.contact || 'N/A', status: 'Active', raw: g, rawType: 'guide' }));
  _allUsers = [...travelers, ...guides];
}

function renderUsers() {
  const search = document.getElementById('user-search').value.toLowerCase();
  const roleF = document.getElementById('role-filter').value;
  const statusF = document.getElementById('status-filter').value;
  let users = [..._allUsers];
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
      <td><span class="badge ${u.role === 'Guide' ? 'badge-warning' : u.role === 'Support' ? 'badge-secondary' : 'badge-info'}">${u.role}</span></td>
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
  document.getElementById('guide-fields').style.display = role === 'Guide' ? 'block' : 'none';
}

function openAddUser() {
  document.getElementById('user-modal-title').textContent = 'Add New User';
  document.getElementById('edit-user-id').value = '';
  document.getElementById('user-form').reset();
  const roleSelect = document.getElementById('u-role');
  for(let i=0; i<roleSelect.options.length; i++) {
    if(roleSelect.options[i].value === 'Traveler') {
      roleSelect.options[i].style.display = 'none';
      roleSelect.options[i].disabled = true;
    }
  }
  roleSelect.disabled = false;
  toggleRoleFields();
  openModal('user-modal');
}

function editUser(id) {
  const u = _allUsers.find(u => u.id === id);
  if (!u) return;
  document.getElementById('user-modal-title').textContent = 'Edit User';
  document.getElementById('edit-user-id').value = id;
  document.getElementById('edit-user-role-type').value = u.rawType;
  document.getElementById('u-name').value = u.name;
  document.getElementById('u-email').value = u.email;
  const phoneRaw = u.phone || '';
  const phoneMatch = phoneRaw.match(/^(\+\d{1,4})\s*(.*)$/);
  if (phoneMatch) {
    document.getElementById('u-country-code').value = phoneMatch[1];
    document.getElementById('u-phone').value = phoneMatch[2].replace(/\D/g, '');
  } else {
    document.getElementById('u-phone').value = phoneRaw.replace(/\D/g, '');
  }
  const roleSelect = document.getElementById('u-role');
  for(let i=0; i<roleSelect.options.length; i++) {
    if(roleSelect.options[i].value === 'Traveler') {
      roleSelect.options[i].style.display = 'block';
      roleSelect.options[i].disabled = false;
    }
  }
  roleSelect.value = u.role;
  roleSelect.disabled = true;
  document.getElementById('u-status').value = u.status;
  document.getElementById('u-password').value = '********';
  document.getElementById('u-confirm').value = '********';
  toggleRoleFields();
  if (u.rawType === 'guide') { document.getElementById('u-language').value = u.raw.languages ? u.raw.languages.join(', ') : ''; document.getElementById('u-experience').value = u.raw.experience || ''; }
  if (u.rawType === 'admin') { document.getElementById('u-region').value = u.raw.region || ''; }
  openModal('user-modal');
}

function viewUser(id) {
  const u = _allUsers.find(u => u.id === id);
  if (!u) return;
  document.getElementById('view-user-content').innerHTML = `
    <div style="padding:4px 0;display:flex;flex-direction:column;gap:12px">
      <div style="text-align:center;padding:16px 0"><div style="width:60px;height:60px;border-radius:50%;background:var(--gradient);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:700;margin:0 auto 12px">${u.name[0]}</div><div style="font-weight:700;font-size:18px">${u.name}</div>${statusBadge(u.status)}</div>
      <div class="flex-between"><span style="color:var(--text-muted)">User ID</span><span style="font-weight:700;color:var(--primary)">${u.id}</span></div>
      <div class="flex-between"><span style="color:var(--text-muted)">Role</span><span class="badge ${u.role === 'Guide' ? 'badge-warning' : u.role === 'Support' ? 'badge-secondary' : 'badge-info'}">${u.role}</span></div>
      <div class="flex-between"><span style="color:var(--text-muted)">Email</span><span>${u.email}</span></div>
      <div class="flex-between"><span style="color:var(--text-muted)">Phone</span><span>${u.phone || 'N/A'}</span></div>
      ${u.rawType === 'guide' ? `<div class="flex-between"><span style="color:var(--text-muted)">Language</span><span>${u.raw.languages ? u.raw.languages.join(', ') : 'N/A'}</span></div><div class="flex-between"><span style="color:var(--text-muted)">Experience</span><span>${u.raw.experience} years</span></div>` : ''}
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('view-user-modal')">Close</button><button class="btn btn-primary" style="background:var(--gradient)" onclick="closeModal('view-user-modal');editUser('${u.id}')">Edit User</button></div>`;
  openModal('view-user-modal');
}

async function saveUser(e) {
  e.preventDefault();
  const id = document.getElementById('edit-user-id').value;
  if (!id || document.getElementById('u-password').value !== '********') {
    if (!validateForm('user-form')) return;
  } else {
    let valid = true;
    ['u-name', 'u-email', 'u-role'].forEach(fid => {
      const el = document.getElementById(fid);
      if (!el.value.trim()) { el.classList.add('error'); valid = false; }
      else el.classList.remove('error');
    });
    if (!valid) { showToast('Please fill required fields', 'error'); return; }
  }
  const role = document.getElementById('u-role').value;
  const name = document.getElementById('u-name').value;
  const email = document.getElementById('u-email').value;
  const phoneDigits = document.getElementById('u-phone').value.replace(/\D/g, '');
  const countryCode = document.getElementById('u-country-code').value;
  const phone = phoneDigits ? (countryCode + ' ' + phoneDigits) : '';

  try {
    if (id) {
      const rawType = document.getElementById('edit-user-role-type').value;
      const numId = parseInt(id.slice(1));
      if (rawType === 'guide') {
        await apiPut(`/guides/${numId}`, {
          name, email, contact: phone,
          languages: document.getElementById('u-language').value.split(',').map(s => s.trim()),
          experience: parseInt(document.getElementById('u-experience').value) || 0
        });
      } else if (rawType === 'traveler') {
        await apiPut(`/travelers/${numId}`, { name, email, phone });
      }
      showToast('User updated successfully!');
    } else {
      if (role === 'Guide') {
        await apiPost('/guides', {
          name, email, contact: phone,
          languages: document.getElementById('u-language').value.split(',').map(s => s.trim()),
          experience: parseInt(document.getElementById('u-experience').value) || 0,
          password: document.getElementById('u-password').value
        });
      } else if (role === 'Traveler') {
        await apiPost('/travelers', { name, email, phone, password: document.getElementById('u-password').value });
      }
      showToast('User added successfully!');
    }
    closeModal('user-modal');
    document.getElementById('user-form').reset();
    document.getElementById('edit-user-id').value = '';
    await loadAllUsers();
  } catch (e) { console.error('Failed to save user:', e); showToast('Failed to save user', 'error'); }
}

async function deleteUser(id) {
  confirmDelete(`Delete user ${id}? This action cannot be undone.`, async () => {
    const rawType = id[0];
    const numId = parseInt(id.slice(1));
    try {
      if (rawType === 'T') await apiDelete(`/travelers/${numId}`);
      else if (rawType === 'G') await apiDelete(`/guides/${numId}`);
      showToast('User deleted', 'error');
      await loadAllUsers();
    } catch (e) { console.error('Failed to delete user:', e); }
  });
}

document.getElementById('user-search').addEventListener('input', renderUsers);
setupLiveValidation('user-form');
loadAllUsers();
if (typeof injectNotifBell === 'function') injectNotifBell('superuser');
