// Demo credentials hint
console.log('Demo: ajith@example.com / traveler123');

function handleLogin(e) {
  e.preventDefault();
  let valid = true;
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const emailErr = document.getElementById('email-error');
  const passErr = document.getElementById('password-error');
  const globalErr = document.getElementById('global-error');

  // Clear errors
  [email, password].forEach(el => el.classList.remove('error'));
  [emailErr, passErr].forEach(el => el.classList.remove('show'));
  globalErr.classList.remove('show');

  // Validate
  if (!email.value.trim()) { email.classList.add('error'); emailErr.classList.add('show'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { email.classList.add('error'); emailErr.classList.add('show'); valid = false; }
  if (!password.value.trim()) { password.classList.add('error'); passErr.classList.add('show'); valid = false; }

  if (!valid) return;

  // Check credentials against mock data
  const user = DB.travelers.find(t => t.email === email.value && t.password === password.value);
  if (user) {
    user.role = 'traveler'; // Ensure role is explicitly set for session
  }
  if (!user) { globalErr.classList.add('show'); return; }

  sessionStorage.setItem('role', 'traveler');
  sessionStorage.setItem('user', JSON.stringify(user));
  window.location.href = 'Traveler/traveler-dashboard.html';
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
