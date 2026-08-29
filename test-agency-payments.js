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
    console.log('Testing Agency 1 Payment Flow...');
    const agency1Headers = { 'x-user-role': 'agency', 'x-user-id': '1' };
    const agency2Headers = { 'x-user-role': 'agency', 'x-user-id': '2' };

    // 1. Create a trip for Agency 1
    const trip = await request('POST', '/trips', {
      destination: 'Agency Test Dest',
      startDate: '2026-10-10',
      endDate: '2026-10-15',
      budget: 50000,
      agencyId: 1
    }, agency1Headers);
    console.log('Trip created:', trip.tripId);

    // 2. Fetch Agency 1 payments
    const payments1 = await request('GET', '/payments/agency/1', null, agency1Headers);
    console.log('Agency 1 Payments count:', payments1.length);
    const tripPayment = payments1.find(p => p.tripId === trip.tripId);
    if (!tripPayment) throw new Error('Payment not created for trip');
    console.log('Found Payment for trip:', tripPayment);

    // 3. Confirm Agency 2 cannot see Agency 1's payments
    try {
      await request('GET', '/payments/agency/1', null, agency2Headers);
      throw new Error('Agency 2 should not be able to access Agency 1 payments!');
    } catch (e) {
      if (e.message.includes('403')) {
        console.log('Isolation verified: Agency 2 got 403 trying to access Agency 1 payments.');
      } else {
        throw e;
      }
    }

    const payments2 = await request('GET', '/payments/agency/2', null, agency2Headers);
    console.log('Agency 2 Payments count:', payments2.length);

    console.log('ALL TESTS PASSED.');
  } catch (e) {
    console.error('TEST FAILED:', e);
  }
}

test();
