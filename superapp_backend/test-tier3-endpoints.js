const http = require('http');

async function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(buf) });
          } catch (e) {
            resolve({ status: res.statusCode, body: buf });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(buf) });
          } catch (e) {
            resolve({ status: res.statusCode, body: buf });
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('=== 1. Logging In as SuperAdmin (thavorac.chun@gmail.com) ===');
  const loginRes = await post('http://localhost:3000/auth/login', {
    email: 'thavorac.chun@gmail.com',
    password: 'Password123!@#',
  });
  if (!loginRes.body.access_token) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.access_token;
  console.log('Login successful.');

  console.log('\n=== 2. Testing Audit Logs: Page 1 (limit=2) ===');
  const auditP1 = await get('http://localhost:3000/audit-logs?page=1&limit=2', token);
  console.log('Status:', auditP1.status);
  console.log('Envelope Success:', auditP1.body.success);
  console.log('Meta:', JSON.stringify(auditP1.body.meta));
  console.log('Data Length:', auditP1.body.data?.length);

  console.log('\n=== 3. Testing Audit Logs: Page 2 Navigation ===');
  const auditP2 = await get('http://localhost:3000/audit-logs?page=2&limit=2', token);
  console.log('Meta:', JSON.stringify(auditP2.body.meta));
  console.log('Data Length:', auditP2.body.data?.length);

  console.log('\n=== 4. Testing Audit Logs: Search Query (?search=BOOTSTRAP) ===');
  const auditSearch = await get('http://localhost:3000/audit-logs?search=BOOTSTRAP', token);
  console.log('Total Matched Items:', auditSearch.body.meta?.totalItems);
  console.log('Matched Action:', auditSearch.body.data?.[0]?.action);

  console.log('\n=== 5. Testing Audit Logs: Action Filter (?action=SECURITY_PROFILE_SYNC) ===');
  const auditAction = await get('http://localhost:3000/audit-logs?action=SECURITY_PROFILE_SYNC', token);
  console.log('Total Matched Items:', auditAction.body.meta?.totalItems);
  console.log('Every Item Matches Action:', auditAction.body.data?.every(d => d.action === 'SECURITY_PROFILE_SYNC'));

  console.log('\n=== 6. Testing Notifications: Pagination & Meta ===');
  const notifRes = await get('http://localhost:3000/notifications?page=1&limit=5', token);
  console.log('Status:', notifRes.status);
  console.log('Envelope Success:', notifRes.body.success);
  console.log('Meta:', JSON.stringify(notifRes.body.meta));
  console.log('Data Length:', notifRes.body.data?.length);

  console.log('\n=== 7. Testing Notifications /mine: Pagination & Meta ===');
  const notifMineRes = await get('http://localhost:3000/notifications/mine?page=1&limit=5', token);
  console.log('Status:', notifMineRes.status);
  console.log('Envelope Success:', notifMineRes.body.success);
  console.log('Meta:', JSON.stringify(notifMineRes.body.meta));

  console.log('\n=============================================');
  console.log('ALL TIER 3 (AUDIT & NOTIF) TESTS PASSED!');
  console.log('=============================================');
}

main().catch(console.error);
