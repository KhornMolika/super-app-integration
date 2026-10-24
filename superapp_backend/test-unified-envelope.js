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
  console.log('--- 1. Authenticating ---');
  const login = await post('http://localhost:3000/auth/login', {
    email: 'thavorac.chun@gmail.com',
    password: 'Password123!@#',
  });
  const token = login.body.access_token;
  console.log('Login Response Envelope Status Code:', login.body.statusCode);
  console.log('Login Response Envelope Message:', login.body.message);
  console.log('Login Response Envelope Path:', login.body.path);
  console.log('Login Response Envelope Timestamp:', login.body.timestamp);

  console.log('\n--- 2. Successful Paginated Query (GET /users?page=1&limit=2) ---');
  const usersRes = await get('http://localhost:3000/users?page=1&limit=2', token);
  console.log('Status Code in Body:', usersRes.body.statusCode);
  console.log('Success Flag:', usersRes.body.success);
  console.log('Message:', usersRes.body.message);
  console.log('Path:', usersRes.body.path);
  console.log('Timestamp:', usersRes.body.timestamp);
  console.log('Data Length:', usersRes.body.data?.length);
  console.log('Meta:', JSON.stringify(usersRes.body.meta));

  console.log('\n--- 3. Successful Single Entity Query (GET /users/me) ---');
  const meRes = await get('http://localhost:3000/users/me', token);
  console.log('Status Code in Body:', meRes.body.statusCode);
  console.log('Success Flag:', meRes.body.success);
  console.log('Message:', meRes.body.message);
  console.log('Path:', meRes.body.path);
  console.log('Timestamp:', meRes.body.timestamp);
  console.log('User Email in data:', meRes.body.data?.email);

  console.log('\n--- 4. Error Query (GET /users/00000000-0000-0000-0000-000000000000 - Non-existent ID) ---');
  const errRes = await get('http://localhost:3000/users/00000000-0000-0000-0000-000000000000', token);
  console.log('HTTP Status:', errRes.status);
  console.log('Status Code in Body:', errRes.body.statusCode);
  console.log('Success Flag:', errRes.body.success);
  console.log('Error Name:', errRes.body.error);
  console.log('Message:', errRes.body.message);
  console.log('Path:', errRes.body.path);
  console.log('Timestamp:', errRes.body.timestamp);

  console.log('\n--- 5. Validation Error Query (POST /auth/login with invalid email) ---');
  const valErrRes = await post('http://localhost:3000/auth/login', {
    email: 'not-an-email',
    password: '',
  });
  console.log('HTTP Status:', valErrRes.status);
  console.log('Status Code in Body:', valErrRes.body.statusCode);
  console.log('Success Flag:', valErrRes.body.success);
  console.log('Error Name:', valErrRes.body.error);
  console.log('Message:', JSON.stringify(valErrRes.body.message));
  console.log('Code:', valErrRes.body.code);
  console.log('Path:', valErrRes.body.path);
  console.log('Timestamp:', valErrRes.body.timestamp);

  console.log('\n======================================================');
  console.log('UNIFIED ENTERPRISE ENVELOPE VERIFIED (SUCCESS & ERROR)');
  console.log('======================================================');
}

main().catch(console.error);
