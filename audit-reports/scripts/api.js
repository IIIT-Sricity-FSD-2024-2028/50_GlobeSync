// Small API client used by probe and regression scripts.
const B = process.env.API || 'http://localhost:3001';
async function call(method, path, token, body, headers = {}) {
  const res = await fetch(B + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}
async function login(email, password) {
  const r = await call('POST', '/auth/login', null, { email, password });
  if (r.status !== 200 && r.status !== 201) throw new Error(`login ${email} ${r.status} ${JSON.stringify(r.data)}`);
  return { token: r.data.accessToken, user: r.data.user, refreshToken: r.data.refreshToken };
}
function future(days) { return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10); }
const results = [];
function check(id, desc, cond, detail) {
  results.push({ id, desc, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${desc}${cond ? '' : '  -> ' + String(JSON.stringify(detail)).slice(0, 300)}`);
}
module.exports = { call, login, future, check, results, B };
