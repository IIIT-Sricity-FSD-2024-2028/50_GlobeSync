const urlParams = new URLSearchParams(window.location.search);
const pageRole = urlParams.get('role') || 'admin';

// =============================================
// ACCESS CODES — Role-based invite gate
// In a real app these would be server-side tokens
// =============================================
const ACCESS_CODES = {
  admin:     'ADMIN-TICP',
  superuser: 'ADMIN-TICP',  // same portal, same code
  guide:     'GUIDE-2026',
  support:   'SUPP-2026'
};

// =============================================
// LOGIN LOGIC
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  const accessGroup = document.getElementById('access-code-group');
  const roleBadge   = document.getElementById('role-badge');
  const codeHint    = document.getElementById('code-hint');
  const accessInput = document.getElementById('access-code');

  if (pageRole === 'guide') {
    document.title = 'GlobeSync — Guide Login';
    document.querySelector('.logo-name')?.replaceWith(
      Object.assign(document.createElement('span'), { className: 'logo-name', textContent: 'TICP Guide' })
    );
    const title = document.getElementById('page-title');
    if (title) title.innerHTML = 'Guide<br>Access';
    const sub = document.getElementById('page-sub');
    if (sub) sub.innerHTML = 'Enter your guide credentials<br>to continue.';
    const label = document.getElementById('email-label');
    if (label) label.textContent = 'Guide Email / Username';
    const btn = document.getElementById('submit-btn');
    if (btn) { btn.textContent = 'Access Portal →'; btn.style.background = 'linear-gradient(90deg, #f28c5e, #f5a623)'; }
    const perks = document.querySelector('.perks-box');
    if (perks) perks.innerHTML = '<div class="perks-title">Guide Dashboard Features:</div><div class="perks"><div class="perk"><div class="perk-icon">🗺️</div>Itineraries</div><div class="perk"><div class="perk-icon">👥</div>Travelers</div><div class="perk"><div class="perk-icon">💬</div>Chat</div></div>';

    // Show access code field for Guide
    if (accessGroup) accessGroup.classList.add('show');
    if (roleBadge)   roleBadge.innerHTML = '🔑 GUIDE INVITE CODE REQUIRED';
    if (codeHint)    codeHint.textContent = '💡 Code: GUIDE-2026 (given by admin at onboarding)';
    document.getElementById('email').value    = 'raju@gmail.com';
    document.getElementById('password').value = 'guide123';
    if (accessInput) accessInput.value = 'GUIDE-2026';

  } else if (pageRole === 'support') {
    document.title = 'GlobeSync — Support Login';
    document.querySelector('.logo-name')?.replaceWith(
      Object.assign(document.createElement('span'), { className: 'logo-name', textContent: 'TICP Support' })
    );
    const title = document.getElementById('page-title');
    if (title) title.innerHTML = 'Support<br>Access';
    const sub = document.getElementById('page-sub');
    if (sub) sub.innerHTML = 'Enter your support credentials<br>to continue.';
    const label = document.getElementById('email-label');
    if (label) label.textContent = 'Support Email / Username';
    const btn = document.getElementById('submit-btn');
    if (btn) { btn.textContent = 'Access Portal →'; btn.style.background = 'linear-gradient(90deg, #f5a623, #ffd359)'; btn.style.color = '#854d0e'; }
    const perks = document.querySelector('.perks-box');
    if (perks) perks.innerHTML = '<div class="perks-title">Support Dashboard Features:</div><div class="perks"><div class="perk"><div class="perk-icon">🎧</div>Tickets</div><div class="perk"><div class="perk-icon">💬</div>Chat</div><div class="perk"><div class="perk-icon">🔄</div>Refunds</div></div>';

    // Show access code field for Support
    if (accessGroup) accessGroup.classList.add('show');
    if (roleBadge)   roleBadge.innerHTML = '🔑 SUPPORT INVITE CODE REQUIRED';
    if (codeHint)    codeHint.textContent = '💡 Code: SUPP-2026 (given by admin at onboarding)';
    document.getElementById('email').value    = 'sarah.johnson@gmail.com';
    document.getElementById('password').value = 'support123';
    if (accessInput) accessInput.value = 'SUPP-2026';

  } else {
    // Admin / Super User — also requires code
    if (accessGroup) accessGroup.classList.add('show');
    if (roleBadge)   roleBadge.innerHTML = '🛡️ ADMIN INVITE CODE REQUIRED';
    if (codeHint)    codeHint.textContent = '💡 Code: ADMIN-TICP (internal use only)';
    if (accessInput) accessInput.value = 'ADMIN-TICP';
  }
});

function handleLogin(e) {
  e.preventDefault();
  const email      = document.getElementById('email');
  const password   = document.getElementById('password');
  const accessCode = document.getElementById('access-code');
  let valid = true;

  // Clear previous errors
  [email, password].forEach(el => el.classList.remove('error'));
  if (accessCode) accessCode.classList.remove('error');
  ['email-error','password-error','access-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  const globErr = document.getElementById('global-error');
  if (globErr) globErr.classList.remove('show');

  // ── Step 1: Validate Access Code ──
  const expectedCode = ACCESS_CODES[pageRole] || ACCESS_CODES['admin'];
  const enteredCode  = (accessCode?.value || '').trim().toUpperCase();
  if (enteredCode !== expectedCode.toUpperCase()) {
    if (accessCode) accessCode.classList.add('error');
    const accErr = document.getElementById('access-error');
    if (accErr) {
      accErr.textContent = '❌ Invalid access code. Contact your administrator.';
      accErr.classList.add('show');
    }
    valid = false;
  }

  // ── Step 2: Validate email & password ──
  if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    email.classList.add('error');
    const errEm = document.getElementById('email-error');
    if (errEm) errEm.classList.add('show');
    valid = false;
  }
  if (!password.value.trim()) {
    password.classList.add('error');
    const errPw = document.getElementById('password-error');
    if (errPw) errPw.classList.add('show');
    valid = false;
  }
  if (!valid) return;

  // ── Step 3: Match credentials against DB ──
  let matchedUser = null;

  if (pageRole === 'guide') {
    matchedUser = DB.travelGuides.find(g => g.email === email.value && g.password === password.value);
  } else if (pageRole === 'support') {
    matchedUser = DB.customerCare.find(c => c.email === email.value && c.password === password.value);
  } else {
    // Admin / Super User (both from administrators collection)
    matchedUser = DB.administrators.find(a => a.email === email.value && a.password === password.value);
  }

  if (!matchedUser) {
    if (globErr) {
      globErr.textContent = '❌ Invalid email or password. Please try again.';
      globErr.classList.add('show');
    }
    return;
  }

  // ── Step 4: Store session & route ──
  sessionStorage.setItem('role', matchedUser.role);
  sessionStorage.setItem('user', JSON.stringify(matchedUser));

  if (matchedUser.role === 'superuser')   window.location.href = 'super/super-dashboard.html';
  else if (matchedUser.role === 'admin')  window.location.href = 'admin/admin-dashboard.html';
  else if (matchedUser.role === 'guide')  window.location.href = 'guide/guide-dashboard.html';
  else if (matchedUser.role === 'support') window.location.href = 'support/support-dashboard.html';
  else alert('Login successful! Redirecting...');
}

// Clear error states on input
document.querySelectorAll('input').forEach(el => el.addEventListener('input', () => {
  el.classList.remove('error');
  const err = document.getElementById(el.id + '-error');
  if (err) err.classList.remove('show');
  const globErr = document.getElementById('global-error');
  if (globErr) globErr.classList.remove('show');
}));
