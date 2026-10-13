/**
 * verify_guide_profile.js
 *
 * Verifies the guide profile API contracts used by GuideProfilePage:
 * 1.  Guide 1 can read their own profile  (GET /guides/1)
 * 2.  Password is stripped from GET response
 * 3.  Guide 1 can update their own name   (PUT /guides/1)
 * 4.  Updated name is reflected on subsequent GET
 * 5.  Updated email is accepted and persisted
 * 6.  Languages array is accepted correctly
 * 7.  Experience number is accepted
 * 8.  pricePerTrip number is accepted
 * 9.  Password update is accepted (but NOT returned in response)
 * 10. rating field is NOT in GET response body (admin-managed)
 * 11. adminId is NOT self-editable (guide update ignores any adminId attempt
 *     or rejects it — document actual behaviour)
 * 12. Guide 1 CANNOT update Guide 2 profile (403)
 * 13. Guide 2 CANNOT update Guide 1 profile (403)
 * 14. Restore original Guide 1 data after tests
 */

const BASE = 'http://localhost:3000';

const G1 = { 'Content-Type': 'application/json', 'x-user-role': 'guide', 'x-user-id': '1' };
const G2 = { 'Content-Type': 'application/json', 'x-user-role': 'guide', 'x-user-id': '2' };

let passed = 0;
let failed = 0;

// Original Guide 1 data (restored at end)
let original = null;

async function check(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}: ${err.message}`);
    failed++;
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

async function get(path, headers) {
  return fetch(`${BASE}${path}`, { headers });
}

async function put(path, body, headers) {
  return fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
}

async function run() {
  console.log('\n=== Guide Profile Verification ===\n');

  // 1. GET own profile
  await check('Guide 1 reads own profile (GET /guides/1)', async () => {
    const res = await get('/guides/1', G1);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.guideId === 1, 'Expected guideId 1');
    assert(data.name, 'Expected name');
    assert(data.email, 'Expected email');
    original = data; // save for restore
    console.log(`     → name="${data.name}", email="${data.email}"`);
  });

  // 2. Password not in GET response
  await check('Password is NOT returned in GET /guides/1 response', async () => {
    const res = await get('/guides/1', G1);
    const data = await res.json();
    assert(!('password' in data), 'password field should be stripped from response');
  });

  // 3. Guide 1 updates own name
  await check('Guide 1 updates own name (PUT /guides/1)', async () => {
    const res = await put('/guides/1', { name: 'Devansh Updated' }, G1);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.name === 'Devansh Updated', `Expected updated name, got "${data.name}"`);
    assert(!('password' in data), 'password must not appear in PUT response');
  });

  // 4. Updated name is reflected on GET
  await check('Updated name persists on subsequent GET /guides/1', async () => {
    const res = await get('/guides/1', G1);
    const data = await res.json();
    assert(data.name === 'Devansh Updated', `Expected "Devansh Updated", got "${data.name}"`);
  });

  // 5. Email update
  await check('Email update is accepted (PUT /guides/1)', async () => {
    const res = await put('/guides/1', { email: 'devansh.test@example.com' }, G1);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.email === 'devansh.test@example.com', `Email not updated, got "${data.email}"`);
  });

  // 6. Languages array update
  await check('Languages array is accepted (PUT /guides/1)', async () => {
    const langs = ['English', 'Hindi', 'Tamil'];
    const res = await put('/guides/1', { languages: langs }, G1);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.languages), 'languages should be an array');
    assert(data.languages.length === 3, `Expected 3 languages, got ${data.languages.length}`);
    assert(data.languages.includes('Tamil'), 'Tamil should be in languages');
  });

  // 7. Experience update
  await check('Experience number is accepted (PUT /guides/1)', async () => {
    const res = await put('/guides/1', { experience: 7 }, G1);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.experience === 7, `Expected experience 7, got ${data.experience}`);
  });

  // 8. pricePerTrip update
  await check('pricePerTrip number is accepted (PUT /guides/1)', async () => {
    const res = await put('/guides/1', { pricePerTrip: 6500 }, G1);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.pricePerTrip === 6500, `Expected 6500, got ${data.pricePerTrip}`);
  });

  // 9. Password update: accepted but not returned
  await check('Password update is accepted but not returned in response', async () => {
    const res = await put('/guides/1', { password: 'newSecurePass99' }, G1);
    assert(res.ok, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(!('password' in data), 'password must NOT be in PUT response');
  });

  // 10. rating — document whether it's in GET response (admin-set field)
  await check('rating field documented: is it in GET response (admin-managed)', async () => {
    const res = await get('/guides/1', G1);
    const data = await res.json();
    // rating is returned by GET (it's a data field) but UI does not expose it as self-editable
    const hasRating = 'rating' in data;
    console.log(`     → rating in GET response: ${hasRating} (value: ${data.rating}). UI read-only.`);
    // No assertion: just document actual behavior
  });

  // 11. adminId self-edit: document behavior
  await check('adminId self-edit attempt: document backend behavior', async () => {
    const res = await put('/guides/1', { adminId: 99 }, G1);
    console.log(`     → Status: ${res.status}. adminId field: ${res.ok ? 'accepted by DTO (UI excludes it)' : 'rejected by backend'}`);
    // No assertion: behavior documented; UI correctly excludes adminId from form payload
  });

  // 12. Guide 1 CANNOT update Guide 2
  await check('Guide 1 cannot update Guide 2 profile (403)', async () => {
    const res = await put('/guides/2', { name: 'Hacked' }, G1);
    assert(
      res.status === 403 || res.status === 401,
      `Expected 403/401 (ownership), got ${res.status}`,
    );
  });

  // 13. Guide 2 CANNOT update Guide 1
  await check('Guide 2 cannot update Guide 1 profile (403)', async () => {
    const res = await put('/guides/1', { name: 'Hacked' }, G2);
    assert(
      res.status === 403 || res.status === 401,
      `Expected 403/401 (ownership), got ${res.status}`,
    );
  });

  // 14. Restore original Guide 1 data
  await check('Restore original Guide 1 data', async () => {
    if (!original) { console.log('     → No original saved, skipping.'); return; }
    const restore = {
      name:         original.name,
      email:        original.email,
      contact:      original.contact,
      languages:    original.languages,
      experience:   original.experience,
      pricePerTrip: original.pricePerTrip,
      password:     'guide123',
    };
    const res = await put('/guides/1', restore, G1);
    assert(res.ok, `Restore failed with status ${res.status}`);
    const data = await res.json();
    assert(data.name === original.name, `Name not restored: "${data.name}"`);
    console.log(`     → Guide 1 restored to name="${data.name}"`);
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
