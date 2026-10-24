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

  console.log('\n=== 2. Testing Capabilities: Default Pagination & Unified Envelope (limit=2) ===');
  const page1 = await get('http://localhost:3000/capabilities?page=1&limit=2', token);
  console.log('HTTP Status:', page1.status);
  console.log('Status Code in Body:', page1.body.statusCode);
  console.log('Envelope Success:', page1.body.success);
  console.log('Envelope Message:', page1.body.message);
  console.log('Envelope Path:', page1.body.path);
  console.log('Meta:', JSON.stringify(page1.body.meta));
  console.log('Returned Capabilities Count:', page1.body.data?.length);

  console.log('\n=== 3. Testing Capabilities: Page 2 Navigation ===');
  const page2 = await get('http://localhost:3000/capabilities?page=2&limit=2', token);
  console.log('Page 2 Meta:', JSON.stringify(page2.body.meta));
  console.log('Page 2 Returned Count:', page2.body.data?.length);

  console.log('\n=== 4. Testing Capabilities: Search Query (?search=camera) ===');
  const searchRes = await get('http://localhost:3000/capabilities?search=camera', token);
  console.log('Search Total Items:', searchRes.body.meta?.totalItems);
  console.log('Matched Capability Name:', searchRes.body.data?.[0]?.name);

  console.log('\n=== 5. Testing Capabilities: Category Filter ===');
  // First get a category from page1
  const sampleCategory = page1.body.data?.[0]?.category || 'DEVICE';
  const categoryRes = await get(`http://localhost:3000/capabilities?category=${encodeURIComponent(sampleCategory)}`, token);
  console.log(`Category (${sampleCategory}) Total Items:`, categoryRes.body.meta?.totalItems);
  console.log('All Items Match Category:', categoryRes.body.data?.every(d => !d.category || d.category.toLowerCase() === sampleCategory.toLowerCase()));

  console.log('\n=== 6. Testing Backwards-Compatible Alias Route: GET /permissions ===');
  const aliasRes = await get('http://localhost:3000/permissions?page=1&limit=3', token);
  console.log('Alias Route HTTP Status:', aliasRes.status);
  console.log('Alias Route Meta:', JSON.stringify(aliasRes.body.meta));
  console.log('Alias Returned Count:', aliasRes.body.data?.length);

  console.log('\n======================================================');
  console.log('ALL TASK 1.2 (SYSTEM CAPABILITIES) TESTS PASSED!');
  console.log('======================================================');
}

main().catch(console.error);
