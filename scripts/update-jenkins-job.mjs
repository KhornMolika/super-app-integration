import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.join(process.cwd(), 'dps_backend', '.env.development');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv();

const jenkinsUrl = process.env.JENKINS_URL || 'http://localhost:8085';
const jenkinsUser = process.env.JENKINS_USER || 'admin';
const jenkinsToken = process.env.JENKINS_API_TOKEN || process.env.JENKINS_TOKEN || '';
const auth = Buffer.from(`${jenkinsUser}:${jenkinsToken}`).toString('base64');

async function syncJob(jobName, scriptFile) {
  if (!fs.existsSync(scriptFile)) {
    console.warn(`⚠️ Script file ${scriptFile} not found for job ${jobName}`);
    return;
  }

  const jenkinsfile = fs.readFileSync(scriptFile, 'utf8');

  // 1. Fetch current config.xml
  const getRes = await fetch(`${jenkinsUrl}/job/${jobName}/config.xml`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!getRes.ok) {
    console.error(`❌ Failed to get config.xml for ${jobName}:`, getRes.status, getRes.statusText);
    return;
  }

  let configXml = await getRes.text();

  // 2. Sanitize non-BMP characters and escape XML chars for script tag
  const sanitized = jenkinsfile.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
  const escapedScript = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 3. Replace <script>...</script> safely using function to avoid $ replacement corruption
  configXml = configXml.replace(/<script>[\s\S]*?<\/script>/, () => `<script>${escapedScript}</script>`);

  // 4. Post updated config.xml
  const postRes = await fetch(`${jenkinsUrl}/job/${jobName}/config.xml`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/xml',
    },
    body: configXml,
  });

  if (postRes.ok) {
    console.log(`✅ Successfully synced ${jobName} on Jenkins!`);
  } else {
    console.error(`❌ Failed to update ${jobName} config.xml:`, postRes.status, await postRes.text());
  }
}

async function main() {
  console.log('🔄 Syncing declarative pipelines with Jenkins controller...');
  await syncJob('miniapp-validation', 'scripts/jenkins/Jenkinsfile.miniapp-validation');
  await syncJob('superapp-sandbox-build', 'scripts/jenkins/Jenkinsfile.superapp-sandbox-build');
  await syncJob('superapp-test-build', 'scripts/jenkins/Jenkinsfile.superapp-test-build');
  console.log('✨ All Jenkins jobs synchronized successfully.');
}

main().catch((err) => console.error('Error:', err));

