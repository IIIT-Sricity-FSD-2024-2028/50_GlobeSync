// Demo credentials hint
console.log('Demo: Arjun@gmail.com / traveler123');

async function handleLogin(e) {
  e.preventDefault();
  let valid = true;
  const emailVal = document.getElementById('email').value.trim().toLowerCase();
  const passwordVal = document.getElementById('password').value.trim();
  const emailErr = document.getElementById('email-error');
  const passErr = document.getElementById('password-error');
  const globalErr = document.getElementById('global-error');

  // Clear errors
  document.getElementById('email').classList.remove('error');
  document.getElementById('password').classList.remove('error');
  [emailErr, passErr].forEach(el => el.classList.remove('show'));
  globalErr.classList.remove('show');

  // Validate
  if (!emailVal) { document.getElementById('email').classList.add('error'); emailErr.classList.add('show'); valid = false; }
  if (!passwordVal) { document.getElementById('password').classList.add('error'); passErr.classList.add('show'); valid = false; }

  if (!valid) return;

  // ── Call backend API ──
  try {
    const result = await apiPost('/auth/traveler-login', {
      email: emailVal,
      password: passwordVal,
    });

    // Store session (same keys as before for compatibility)
    result.user.role = result.role;
    localStorage.setItem('role', result.role);
    localStorage.setItem('user', JSON.stringify(result.user));

    // Redirect to traveler dashboard
    window.location.href = 'Traveler/traveler-dashboard.html';

  } catch (err) {
    // apiPost already logs the error; show it in the UI
    globalErr.classList.add('show');
  }
}

// Reset Functionality
function resetSystemData() {
  if (confirm("This will clear all local data (trips, messages, etc.) and restore defaults. Proceed?")) {
    localStorage.removeItem('gs_database');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    alert("System data reset. The page will now reload with original data.");
    window.location.reload();
  }
}

// Live validation
document.getElementById('email').addEventListener('input', function() {
  this.classList.remove('error');
  document.getElementById('email-error').classList.remove('show');
  document.getElementById('global-error').classList.remove('show');
});
document.getElementById('password').addEventListener('input', function() {
  this.classList.remove('error');
  document.getElementById('password-error').classList.remove('show');
  document.getElementById('global-error').classList.remove('show');
});
