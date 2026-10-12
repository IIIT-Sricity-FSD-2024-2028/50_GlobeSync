function handleSearch() {
  const dest = document.getElementById('dest-search').value.trim();
  if (!dest) { alert('Please enter a destination'); return; }
  window.location.href = 'role-select.html';
}

function submitContact(e) {
  e.preventDefault();
  let valid = true;
  const fields = [
    { id: 'c-name', errId: 'c-name-error', msg: 'Name is required' },
    { id: 'c-email', errId: 'c-email-error', msg: 'Valid email is required', isEmail: true },
    { id: 'c-msg', errId: 'c-msg-error', msg: 'Message is required' }
  ];
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    const err = document.getElementById(f.errId);
    const val = el.value.trim();
    let msg = '';
    if (!val) msg = f.msg;
    else if (f.isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) msg = 'Please enter a valid email';
    if (msg) { el.style.borderColor = '#ef4444'; err.textContent = msg; err.style.display = 'block'; valid = false; }
    else { el.style.borderColor = '#e5e7eb'; err.style.display = 'none'; }
  });
  if (valid) { alert('Message sent successfully! We will get back to you soon.'); e.target.reset(); }
}
