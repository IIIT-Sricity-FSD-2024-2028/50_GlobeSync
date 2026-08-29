const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'front-end', 'super');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'agencies.html' && f !== 'super-dashboard.html');

for (const file of files) {
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, 'utf8');
  
  if (!content.includes('href="agencies.html"')) {
    content = content.replace(
      '<a class="nav-item" href="users.html"><span class="nav-icon">👥</span>Users</a>',
      '<a class="nav-item" href="users.html"><span class="nav-icon">👥</span>Users</a>\n      <a class="nav-item" href="agencies.html"><span class="nav-icon">🏢</span>Agencies</a>'
    );
    fs.writeFileSync(fp, content);
    console.log('Injected into ' + file);
  }
}
console.log('Done');
