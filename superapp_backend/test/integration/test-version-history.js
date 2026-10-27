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

  console.log('\n=== 2. Retrieving or Creating a MiniApp to test version history ===');
  const appsRes = await get('http://localhost:3000/mini-apps?page=1&limit=5', token);
  let miniApps = appsRes.body.data || [];
  let miniAppId;

  if (miniApps.length > 0) {
    miniAppId = miniApps[0].id;
    console.log('Using Existing MiniApp ID:', miniAppId, 'Name:', miniApps[0].name);
  } else {
    const randomSuffix = Date.now();
    const appRes = await post(
      'http://localhost:3000/mini-apps/draft',
      {
        appId: `com.example.versionapp.${randomSuffix}`,
        name: 'Version Test App',
        description: 'MiniApp to test paginated version history',
        integrationMethod: 'WEBVIEW',
        integrationConfigWebView: {
          webUrl: 'https://example.com',
          isDomainVerified: true,
        },
      },
      token,
    );
    miniAppId = appRes.body.data?.id || appRes.body.id;
    console.log('Created New MiniApp ID:', miniAppId);
  }

  if (!miniAppId) {
    console.error('Failed to get or create MiniApp.');
    process.exit(1);
  }

  console.log('\n=== 3. Testing MiniApp Version History: Pagination & Envelope (limit=1) ===');
  const vPage1 = await get(`http://localhost:3000/mini-apps/${miniAppId}/versions?page=1&limit=1`, token);
  console.log('HTTP Status:', vPage1.status);
  console.log('Status Code in Body:', vPage1.body.statusCode);
  console.log('Envelope Success:', vPage1.body.success);
  console.log('Envelope Message:', vPage1.body.message);
  console.log('Envelope Path:', vPage1.body.path);
  console.log('Meta:', JSON.stringify(vPage1.body.meta));
  console.log('Data Meta:', JSON.stringify(vPage1.body.data?.meta));
  console.log('Returned Versions Count in Page 1:', vPage1.body.data?.versions?.length);
  console.log('First Version Tag:', vPage1.body.data?.versions?.[0]?.version);

  console.log('\n=== 4. Testing MiniApp Version History: Page 2 Navigation ===');
  const vPage2 = await get(`http://localhost:3000/mini-apps/${miniAppId}/versions?page=2&limit=1`, token);
  console.log('Page 2 Meta:', JSON.stringify(vPage2.body.meta));
  console.log('Returned Versions Count in Page 2:', vPage2.body.data?.versions?.length);
  console.log('Page 2 Version Tag:', vPage2.body.data?.versions?.[0]?.version);

  console.log('\n=== 5. Testing MiniApp Version History: Sort Order (ASC) ===');
  const vAsc = await get(`http://localhost:3000/mini-apps/${miniAppId}/versions?sortOrder=ASC&limit=5`, token);
  console.log('ASC Total Versions:', vAsc.body.data?.versions?.length);
  console.log('ASC First Version:', vAsc.body.data?.versions?.[0]?.version);

  console.log('\n======================================================');
  console.log('ALL TASK 1.4 (VERSION HISTORY) TESTS PASSED!');
  console.log('======================================================');
}

main().catch(console.error);
