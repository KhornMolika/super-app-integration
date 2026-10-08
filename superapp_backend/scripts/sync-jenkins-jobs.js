const fs = require('fs');

const LOCAL_JENKINS_URL = (process.env.LOCAL_JENKINS_URL || 'http://localhost:8085').replace(/\/+$/, '');
const LOCAL_USER = process.env.LOCAL_JENKINS_USER || 'admin';
const LOCAL_PASS = process.env.LOCAL_JENKINS_PASS || 'admin123';

const REMOTE_JENKINS_URL = (process.env.REMOTE_JENKINS_URL || 'https://app.fintechcenterfsa.com/jenkins').replace(/\/+$/, '');
const REMOTE_USER = process.env.REMOTE_JENKINS_USER || 'admin';
const REMOTE_PASS = process.env.REMOTE_JENKINS_PASS || process.argv[2];

if (!REMOTE_PASS) {
  console.error('========================================================');
  console.error('Error: Please provide remote Jenkins admin password or API token.');
  console.error('Usage: node scripts/sync-jenkins-jobs.js <REMOTE_JENKINS_PASSWORD_OR_API_TOKEN>');
  console.error('========================================================');
  process.exit(1);
}

const localAuth = 'Basic ' + Buffer.from(`${LOCAL_USER}:${LOCAL_PASS}`).toString('base64');
const remoteAuth = 'Basic ' + Buffer.from(`${REMOTE_USER}:${REMOTE_PASS}`).toString('base64');

// Cookie Jar to track session cookies across requests
let cookieJar = new Map();

function saveCookies(res) {
  let cookieHeaders = [];
  if (typeof res.headers.getSetCookie === 'function') {
    cookieHeaders = res.headers.getSetCookie();
  } else {
    const raw = res.headers.get('set-cookie');
    if (raw) cookieHeaders = [raw];
  }
  for (const header of cookieHeaders) {
    if (!header) continue;
    const parts = header.split(';')[0].split('=');
    if (parts.length >= 2) {
      cookieJar.set(parts[0].trim(), parts.slice(1).join('=').trim());
    }
  }
}

function getCookieString() {
  if (cookieJar.size === 0) return '';
  return Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

function extractJenkinsError(html) {
  if (!html) return '';
  const matchPre = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (matchPre) return matchPre[1].trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const matchH2 = html.match(/<h2>([\s\S]*?)<\/h2>/i);
  if (matchH2) return matchH2[1].trim();
  const matchP = html.match(/<p>([\s\S]*?)<\/p>/i);
  if (matchP) return matchP[1].trim();
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 300);
}

async function getRemoteCrumb() {
  try {
    const headers = { Authorization: remoteAuth };
    const cookieStr = getCookieString();
    if (cookieStr) headers['Cookie'] = cookieStr;

    const res = await fetch(`${REMOTE_JENKINS_URL}/crumbIssuer/api/json`, { headers });
    saveCookies(res);

    if (res.ok) {
      const data = await res.json();
      return {
        headerName: data.crumbRequestField || 'Jenkins-Crumb',
        crumb: data.crumb,
      };
    }
  } catch (_) {}
  return { headerName: 'Jenkins-Crumb', crumb: '' };
}

function sanitizeXmlForProduction(xml) {
  let result = xml;

  // 1. Replace old personal GitHub repo with official GitLab repo
  result = result.replace(
    /https:\/\/github\.com\/KhornMolika\/super-app-integration\.git/g,
    'https://git.fintechcenterfsa.com/frontend/super-app.git'
  );

  // 2. Replace localhost backend callback URLs with production backend URL
  result = result.replace(
    /http:\/\/host\.docker\.internal:3000\/api/g,
    'https://app.fintechcenterfsa.com/api'
  );
  result = result.replace(
    /http:\/\/localhost:3000\/api/g,
    'https://app.fintechcenterfsa.com/api'
  );

  // 3. Replace localhost Nexus URL with production Nexus URL
  result = result.replace(
    /http:\/\/host\.docker\.internal:8081/g,
    'https://app.fintechcenterfsa.com/nexus'
  );
  result = result.replace(
    /http:\/\/localhost:8081/g,
    'https://app.fintechcenterfsa.com/nexus'
  );

  return result;
}

async function syncJobs() {
  console.log('========================================================');
  console.log(' Jenkins Job Synchronization from Local to Production');
  console.log(` Source : ${LOCAL_JENKINS_URL}`);
  console.log(` Target : ${REMOTE_JENKINS_URL}`);
  console.log('========================================================\n');

  // Step 1: Initial handshake to obtain session cookie & crumb
  const testRes = await fetch(`${REMOTE_JENKINS_URL}/api/json`, {
    headers: { Authorization: remoteAuth },
  });
  saveCookies(testRes);

  const crumbInfo = await getRemoteCrumb();
  if (crumbInfo.crumb) {
    console.log('[OK] Obtained remote Jenkins CSRF Crumb.');
  }
  if (cookieJar.size > 0) {
    console.log(`[OK] Established session cookie (${cookieJar.size} cookies).`);
  }

  // Step 2: Fetch list of local jobs
  const listRes = await fetch(`${LOCAL_JENKINS_URL}/api/json`, {
    headers: { Authorization: localAuth },
  });
  if (!listRes.ok) {
    console.error(`Failed to fetch local jobs: HTTP ${listRes.status}`);
    return;
  }
  const localData = await listRes.json();
  const jobNames = localData.jobs.map((j) => j.name);
  console.log(`Found ${jobNames.length} local jobs: ${jobNames.join(', ')}\n`);

  // Step 3: Fetch list of existing remote jobs
  const remoteHeaders = { Authorization: remoteAuth };
  const cookieStr = getCookieString();
  if (cookieStr) remoteHeaders['Cookie'] = cookieStr;

  const remoteListRes = await fetch(`${REMOTE_JENKINS_URL}/api/json`, {
    headers: remoteHeaders,
  });
  if (!remoteListRes.ok) {
    console.error(`Failed to authenticate with Remote Jenkins: HTTP ${remoteListRes.status} ${remoteListRes.statusText}`);
    return;
  }
  saveCookies(remoteListRes);
  const remoteData = await remoteListRes.json();
  const existingRemoteJobs = new Set(remoteData.jobs.map((j) => j.name));

  // Step 4: Sync each job
  for (const jobName of jobNames) {
    console.log(`--> Syncing job "${jobName}"...`);

    // Fetch config.xml from local Jenkins
    const configRes = await fetch(`${LOCAL_JENKINS_URL}/job/${encodeURIComponent(jobName)}/config.xml`, {
      headers: { Authorization: localAuth },
    });
    if (!configRes.ok) {
      console.error(`    [ERROR] Failed to fetch local config.xml for "${jobName}" (HTTP ${configRes.status})`);
      continue;
    }

    const localXml = await configRes.text();
    const prodXml = sanitizeXmlForProduction(localXml);
    const xmlBuffer = Buffer.from(prodXml, 'utf-8');

    const postHeaders = {
      Authorization: remoteAuth,
      'Content-Type': 'application/xml',
      'Content-Length': xmlBuffer.length.toString(),
    };
    if (crumbInfo.crumb) {
      postHeaders[crumbInfo.headerName] = crumbInfo.crumb;
    }
    const currentCookies = getCookieString();
    if (currentCookies) {
      postHeaders['Cookie'] = currentCookies;
    }

    if (existingRemoteJobs.has(jobName)) {
      // Update existing job
      const updateRes = await fetch(`${REMOTE_JENKINS_URL}/job/${encodeURIComponent(jobName)}/config.xml`, {
        method: 'POST',
        headers: postHeaders,
        body: xmlBuffer,
      });
      saveCookies(updateRes);

      if (updateRes.ok || updateRes.status === 200) {
        console.log(`    [SUCCESS] Updated existing job "${jobName}" on production Jenkins.`);
      } else {
        const errTxt = await updateRes.text().catch(() => '');
        console.error(`    [ERROR] Failed to update "${jobName}": HTTP ${updateRes.status} ${updateRes.statusText}`);
        if (errTxt) console.error(`    Details: ${extractJenkinsError(errTxt)}`);
      }
    } else {
      // Create new job
      const createRes = await fetch(`${REMOTE_JENKINS_URL}/createItem?name=${encodeURIComponent(jobName)}`, {
        method: 'POST',
        headers: postHeaders,
        body: xmlBuffer,
      });
      saveCookies(createRes);

      if (createRes.ok || createRes.status === 200) {
        console.log(`    [SUCCESS] Created new job "${jobName}" on production Jenkins.`);
      } else {
        const errTxt = await createRes.text().catch(() => '');
        console.error(`    [ERROR] Failed to create "${jobName}": HTTP ${createRes.status} ${createRes.statusText}`);
        if (errTxt) console.error(`    Details: ${extractJenkinsError(errTxt)}`);
      }
    }
  }

  console.log('\n========================================================');
  console.log(' Synchronization step completed.');
  console.log('========================================================');
}

syncJobs().catch((err) => {
  console.error('Fatal synchronization error:', err);
});
