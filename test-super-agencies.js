const http = require('http');

function request(method, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : null);
        } else {
          reject(new Error(`Status ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  try {
    const headers = { 'x-user-role': 'superuser', 'x-user-id': '999' };

    console.log('1. Fetch dashboard to see current metrics');
    const d1 = await request('GET', '/dashboard/superuser', null, headers);
    console.log('Initial agencies count:', d1.agencyMetrics.totalAgencies);

    console.log('2. Create agency directly');
    const newAgency = await request('POST', '/agencies', {
      businessName: 'Super Test Agency',
      contactEmail: 'supertest@example.com',
      contactPhone: '555-9999',
      password: 'password',
      status: 'approved',
      commissionRate: 15
    }, headers);
    console.log('Created agency:', newAgency.agencyId, newAgency.status, newAgency.commissionRate);

    console.log('3. Fetch dashboard again');
    const d2 = await request('GET', '/dashboard/superuser', null, headers);
    console.log('New agencies count:', d2.agencyMetrics.totalAgencies);
    if (d2.agencyMetrics.totalAgencies !== d1.agencyMetrics.totalAgencies + 1) throw new Error('Dashboard not updated');

    console.log('4. Update agency');
    const updated = await request('PATCH', `/agencies/${newAgency.agencyId}`, {
      businessName: 'Super Test Updated'
    }, headers);
    console.log('Updated name:', updated.businessName);

    console.log('5. Delete agency');
    await request('DELETE', `/agencies/${newAgency.agencyId}`, null, headers);
    console.log('Deleted agency.');

    const d3 = await request('GET', '/dashboard/superuser', null, headers);
    console.log('Final agencies count:', d3.agencyMetrics.totalAgencies);

    console.log('ALL TESTS PASSED');
  } catch (e) {
    console.error('TEST FAILED:', e);
  }
}

test();
