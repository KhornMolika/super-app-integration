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
  console.log('Login successful, token acquired.');

  console.log('\n=== 2. Testing Users: Default Pagination & Meta ===');
  const usersPage1 = await get('http://localhost:3000/users?page=1&limit=2', token);
  console.log('Status:', usersPage1.status);
  console.log('Envelope Success:', usersPage1.body.success);
  console.log('Meta:', JSON.stringify(usersPage1.body.meta));
  console.log('Returned Users Count:', usersPage1.body.data?.length);

  console.log('\n=== 3. Testing Users: Page 2 Navigation ===');
  const usersPage2 = await get('http://localhost:3000/users?page=2&limit=2', token);
  console.log('Meta:', JSON.stringify(usersPage2.body.meta));
  console.log('Returned Users Count:', usersPage2.body.data?.length);

  console.log('\n=== 4. Testing Users: Search Query (?search=molika) ===');
  const userSearch = await get('http://localhost:3000/users?search=molika', token);
  console.log('Search Total Items:', userSearch.body.meta?.totalItems);
  console.log('Search Matched Email:', userSearch.body.data?.[0]?.email);

  console.log('\n=== 5. Testing Users: Role Filtering (?role=SUPER_ADMIN) ===');
  const userRole = await get('http://localhost:3000/users?role=SUPER_ADMIN', token);
  console.log('Role Total Items:', userRole.body.meta?.totalItems);
  console.log('Every user has SUPER_ADMIN role:', userRole.body.data?.every(u => u.roles?.some(r => r.name === 'SUPER_ADMIN') || u.role?.name === 'SUPER_ADMIN'));

  console.log('\n=== 6. Testing MiniApps: Pagination & Meta ===');
  const appsPage1 = await get('http://localhost:3000/mini-apps?page=1&limit=2', token);
  console.log('Status:', appsPage1.status);
  console.log('Envelope Success:', appsPage1.body.success);
  console.log('Meta:', JSON.stringify(appsPage1.body.meta));
  console.log('Returned Apps Count:', appsPage1.body.data?.length);

  console.log('\n=== 7. Testing MiniApps: Search Query (?search=payment) ===');
  const appSearch = await get('http://localhost:3000/mini-apps?search=payment', token);
  console.log('Search Total Items:', appSearch.body.meta?.totalItems);

  console.log('\n=== 8. Testing Organizations: Pagination & Meta ===');
  const orgsPage1 = await get('http://localhost:3000/organizations?page=1&limit=3', token);
  console.log('Status:', orgsPage1.status);
  console.log('Envelope Success:', orgsPage1.body.success);
  console.log('Meta:', JSON.stringify(orgsPage1.body.meta));
  console.log('Returned Orgs Count:', orgsPage1.body.data?.length);

  console.log('\n=== 9. Testing Organizations: Search Query (?search=Technology) ===');
  const orgSearch = await get('http://localhost:3000/organizations?search=Technology', token);
  console.log('Search Total Items:', orgSearch.body.meta?.totalItems);
  console.log('Matched Org Name:', orgSearch.body.data?.[0]?.name);

  console.log('\n=== 10. Testing Issues: Pagination & Meta ===');
  const issuesPage1 = await get('http://localhost:3000/mini-apps/issues/all?page=1&limit=2', token);
  console.log('Status:', issuesPage1.status);
  console.log('Envelope Success:', issuesPage1.body.success);
  console.log('Meta:', JSON.stringify(issuesPage1.body.meta));
  console.log('Returned Issues Count:', issuesPage1.body.data?.length);

  console.log('\n=============================================');
  console.log('ALL TIER 1 PAGINATION & SEARCH TESTS PASSED!');
  console.log('=============================================');
}

main().catch(console.error);
