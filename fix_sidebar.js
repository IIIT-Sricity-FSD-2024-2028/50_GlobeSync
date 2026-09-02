const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'front-end', 'super');
const files = ['users.html', 'agencies.html', 'api-management.html', 'rules-config.html', 'reports.html', 'profile.html', 'super-dashboard.html', 'revenue.html'];

const goodSidebar = `    <nav class="sidebar-nav">
      <a class="nav-item" href="super-dashboard.html"><span class="nav-icon">📊</span>Dashboard</a>
      <a class="nav-item" href="revenue.html"><span class="nav-icon">💰</span>Revenue</a>
      <a class="nav-item" href="users.html"><span class="nav-icon">👥</span>Users</a>
      <a class="nav-item" href="agencies.html"><span class="nav-icon">🏢</span>Agencies</a>
      <a class="nav-item" href="api-management.html"><span class="nav-icon">🔌</span>API Management</a>
      <a class="nav-item" href="rules-config.html"><span class="nav-icon">⚙</span>Rules Config</a>
      <a class="nav-item" href="reports.html"><span class="nav-icon">📈</span>Reports</a>
      <a class="nav-item" data-page="profile" href="profile.html"><span class="nav-icon">🔴</span>My Profile</a>
    </nav>`;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace corrupted logos (including weird ?v=2 things or unicode corruptions)
  content = content.replace(/<div class="logo-icon" [^>]*>.*?<\/div>/, '<div class="logo-icon" style="background:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);color:#fff;font-size:18px">🌐</div>');
  
  // Replace the entire corrupted sidebar-nav
  const navStart = content.indexOf('<nav class="sidebar-nav">');
  const navEnd = content.indexOf('</nav>') + 6;
  
  if (navStart > -1 && navEnd > navStart) {
    let newNav = goodSidebar;
    
    // Replace the exact matching href with the active class version
    // e.g. <a class="nav-item" href="users.html"> -> <a class="nav-item active" href="users.html">
    const pageRegex = new RegExp(`(<a class="nav-item" href="${file}">)`);
    newNav = newNav.replace(pageRegex, `<a class="nav-item active" href="${file}">`);
    
    content = content.substring(0, navStart) + newNav + content.substring(navEnd);
  }
  
  // Fix the top title bar that might have been corrupted
  content = content.replace(/<title>.*?<\/title>/, `<title>GlobeSync Superuser</title>`);
  
  fs.writeFileSync(filePath, content, 'utf8');
});
console.log('Fixed encoding in HTML files.');
