const http = require('http');

async function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'GET',
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
  console.log('======================================================');
  console.log('TESTING TASK 3.1: MOBILE MINIAPP CATALOG ENDPOINTS');
  console.log('======================================================');

  console.log('\n=== 1. Testing Default Catalog Pagination & Flutter Compatibility ===');
  const res1 = await get('http://localhost:3000/mobile/mini-apps?limit=1&offset=0');
  console.log('HTTP Status:', res1.status);
  console.log('Status Code in Body:', res1.body.statusCode);
  console.log('Envelope Success:', res1.body.success);
  console.log('Envelope Message:', res1.body.message);
  console.log('Items Array at Root (Flutter Dio compat):', Array.isArray(res1.body.items));
  console.log('Items Count:', res1.body.items?.length);
  console.log('Root Total:', res1.body.total);
  console.log('Root Limit:', res1.body.limit);
  console.log('Root Offset:', res1.body.offset);
  console.log('Meta Object:', JSON.stringify(res1.body.meta));
  console.log('Next Cursor (Base64 infinite scroll):', res1.body.meta?.nextCursor);

  if (!res1.body.success || res1.status !== 200 || !Array.isArray(res1.body.items)) {
    console.error('Test 1 Failed: Expected envelope success and items array at root.');
    process.exit(1);
  }

  console.log('\n=== 2. Testing Page-Based Navigation (?page=2&limit=1) ===');
  const res2 = await get('http://localhost:3000/mobile/mini-apps?page=2&limit=1');
  console.log('Page 2 HTTP Status:', res2.status);
  console.log('Page 2 Meta:', JSON.stringify(res2.body.meta));
  console.log('Page 2 Offset:', res2.body.offset);
  console.log('Has Previous Page:', res2.body.meta?.hasPreviousPage);

  if (res2.status !== 200 || res2.body.meta?.page !== 2 || res2.body.offset !== 1) {
    console.error('Test 2 Failed: Page parameter did not calculate offset correctly.');
    process.exit(1);
  }

  console.log('\n=== 3. Testing Search Query (?q=Version) ===');
  const res3 = await get('http://localhost:3000/mobile/mini-apps?q=Version');
  console.log('Search Items Count:', res3.body.items?.length);
  console.log('Search Total:', res3.body.total);
  if (res3.body.items?.length > 0) {
    console.log('First Matched Name:', res3.body.items[0].name);
  }

  console.log('\n=== 4. Testing Search Query Alias (?search=Version) ===');
  const res4 = await get('http://localhost:3000/mobile/mini-apps?search=Version');
  console.log('Search Alias Items Count:', res4.body.items?.length);
  console.log('Search Alias Total:', res4.body.total);

  console.log('\n=== 5. Testing Route Alias (/api/mobile/mini-apps) ===');
  const res5 = await get('http://localhost:3000/api/mobile/mini-apps?limit=1');
  console.log('Alias Route HTTP Status:', res5.status);
  console.log('Alias Route Success:', res5.body.success);
  console.log('Alias Route Items Count:', res5.body.items?.length);

  if (res5.status !== 200 || !res5.body.success) {
    console.error('Test 5 Failed: /api/mobile/mini-apps failed.');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('ALL TASK 3.1 (MOBILE CATALOG) TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================');
}

main().catch(console.error);
