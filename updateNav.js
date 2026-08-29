const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\aasht\\Documents\\50_GlobeSync-main\\50_GlobeSync-main\\front-end\\agency';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'payments.html');

for (const file of files) {
  const filepath = path.join(dir, file);
  let content = fs.readFileSync(filepath, 'utf8');
  if (!content.includes('payments.html')) {
    content = content.replace(
      '<a class="nav-item" href="commission.html"><span class="nav-icon">💰</span>Commission Ledger</a>',
      '<a class="nav-item" href="commission.html"><span class="nav-icon">💰</span>Commission Ledger</a>\n      <a class="nav-item" href="payments.html"><span class="nav-icon">💳</span>Payments</a>'
    );
    
    // Also try with data-page attribute for the ones that have it
    content = content.replace(
      '<a class="nav-item" data-page="commission" href="commission.html"><span class="nav-icon">💰</span>Commission Ledger</a>',
      '<a class="nav-item" data-page="commission" href="commission.html"><span class="nav-icon">💰</span>Commission Ledger</a>\n      <a class="nav-item" data-page="payments" href="payments.html"><span class="nav-icon">💳</span>Payments</a>'
    );
    
    fs.writeFileSync(filepath, content, 'utf8');
  }
}
console.log('Nav updated successfully');
