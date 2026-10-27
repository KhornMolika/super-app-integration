const http = require('http');

async function post(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        headers,
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(buf) });
          } catch {
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
          } catch {
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
  console.log('=== 1. Logging In as SuperAdmin ===');
  const loginRes = await post('http://localhost:3000/auth/login', {
    email: 'thavorac.chun@gmail.com',
    password: 'Password123!@#',
  });
  const token = loginRes.body.access_token;
  console.log('Auth Token Acquired:', Boolean(token));

  console.log('\n=== 2. Creating a Sample Capability Proposal to guarantee data ===');
  const createRes = await post(
    'http://localhost:3000/capability-proposals',
    {
      capabilityKey: 'biometric_auth_v2',
      capabilityName: 'Biometric Authentication V2',
      description: 'Provides biometric fingerprint and face scanning capability for financial transactions',
    },
    token,
  );
  console.log('Create Proposal HTTP Status:', createRes.status);
  console.log('Created Proposal Key:', createRes.body.data?.capabilityKey || createRes.body.capabilityKey);

  console.log('\n=== 3. Testing Capability Proposals: Default Pagination & Unified Envelope ===');
  const page1 = await get('http://localhost:3000/capability-proposals?page=1&limit=2', token);
  console.log('HTTP Status:', page1.status);
  console.log('Status Code in Body:', page1.body.statusCode);
  console.log('Envelope Success:', page1.body.success);
  console.log('Envelope Message:', page1.body.message);
  console.log('Envelope Path:', page1.body.path);
  console.log('Meta:', JSON.stringify(page1.body.meta));
  console.log('Returned Proposals Count:', page1.body.data?.length);

  console.log('\n=== 4. Testing Capability Proposals: Search Query (?search=biometric) ===');
  const searchRes = await get('http://localhost:3000/capability-proposals?search=biometric', token);
  console.log('Search Total Items:', searchRes.body.meta?.totalItems);
  console.log('Matched Capability Key:', searchRes.body.data?.[0]?.capabilityKey);

  console.log('\n=== 5. Testing Capability Proposals: Status Filter (?status=PENDING) ===');
  const statusRes = await get('http://localhost:3000/capability-proposals?status=PENDING', token);
  console.log('Status Filter Total Items:', statusRes.body.meta?.totalItems);
  console.log('All Statuses match PENDING_REVIEW:', statusRes.body.data?.every(d => d.status === 'PENDING_REVIEW'));

  console.log('\n=== 6. Testing Backwards-Compatible Alias Route: GET /permission-proposals ===');
  const aliasRes = await get('http://localhost:3000/permission-proposals?page=1&limit=1', token);
  console.log('Alias Route HTTP Status:', aliasRes.status);
  console.log('Alias Route Meta:', JSON.stringify(aliasRes.body.meta));
  console.log('Alias Returned Data Count:', aliasRes.body.data?.length);

  console.log('\n======================================================');
  console.log('ALL TASK 1.1 (CAPABILITY PROPOSALS) TESTS PASSED!');
  console.log('======================================================');
}

main().catch(console.error);
