import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.development'),
    path.join(process.cwd(), 'dps_backend', '.env'),
    path.join(process.cwd(), 'dps_backend', '.env.development'),
    path.join(process.cwd(), 'superapp_backend', '.env'),
    path.join(process.cwd(), 'superapp_backend', '.env.development'),
  ];
  for (const envPath of envPaths) {
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
}

loadEnv();

const jenkinsUrl = (process.env.JENKINS_URL || 'http://localhost:8085').replace(/\/+$/, '');
const jenkinsUser = process.env.JENKINS_USER || 'admin';
const jenkinsToken = process.env.JENKINS_API_TOKEN || process.env.JENKINS_TOKEN || '';
const auth = Buffer.from(`${jenkinsUser}:${jenkinsToken}`).toString('base64');

function escapeXmlScript(jenkinsfile) {
  const sanitized = jenkinsfile.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
  return sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildDefaultJobXml(jobName, escapedScript) {
  return `<?xml version="1.1" encoding="UTF-8"?>
<flow-definition plugin="workflow-job@1600.v6f36ed83529d">
  <actions>
    <org.jenkinsci.plugins.pipeline.modeldefinition.actions.DeclarativeJobAction plugin="pipeline-model-definition@2.2293.v6e7193cec599"/>
    <org.jenkinsci.plugins.pipeline.modeldefinition.actions.DeclarativeJobPropertyTrackerAction plugin="pipeline-model-definition@2.2293.v6e7193cec599">
      <jobProperties/>
      <triggers/>
      <parameters/>
    </org.jenkinsci.plugins.pipeline.modeldefinition.actions.DeclarativeJobPropertyTrackerAction>
  </actions>
  <description>Automated CI Pipeline for ${jobName}</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty>
      <abortPrevious>false</abortPrevious>
    </org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps@4267.v39e0eb_f7e1b_2">
    <script>${escapedScript}</script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>`;
}

async function syncJob(jobName, scriptFile) {
  if (!fs.existsSync(scriptFile)) {
    console.warn(`⚠️ Script file ${scriptFile} not found for job ${jobName}`);
    return;
  }

  const jenkinsfile = fs.readFileSync(scriptFile, 'utf8');
  const escapedScript = escapeXmlScript(jenkinsfile);

  // 1. Fetch current config.xml to check existence
  const getRes = await fetch(`${jenkinsUrl}/job/${jobName}/config.xml`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (getRes.ok) {
    // Job exists -> update its script
    let configXml = await getRes.text();
    configXml = configXml.replace(/<script>[\s\S]*?<\/script>/, () => `<script>${escapedScript}</script>`);

    const postRes = await fetch(`${jenkinsUrl}/job/${jobName}/config.xml`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/xml',
      },
      body: configXml,
    });

    if (postRes.ok) {
      console.log(`✅ Successfully updated existing Jenkins job: ${jobName}`);
    } else {
      console.error(`❌ Failed to update ${jobName} config.xml:`, postRes.status, await postRes.text());
    }
  } else if (getRes.status === 404) {
    // Job does not exist -> create it
    const configXml = buildDefaultJobXml(jobName, escapedScript);
    const createRes = await fetch(`${jenkinsUrl}/createItem?name=${jobName}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/xml',
      },
      body: configXml,
    });

    if (createRes.ok) {
      console.log(`✅ Successfully created new Jenkins job: ${jobName}`);
    } else {
      console.error(`❌ Failed to create ${jobName}:`, createRes.status, await createRes.text());
    }
  } else {
    console.error(`❌ Failed to connect to Jenkins for ${jobName}: HTTP ${getRes.status} ${getRes.statusText}`);
  }
}

async function main() {
  console.log('🔄 Synchronizing declarative pipelines with Jenkins controller...');
  console.log(`Connecting to: ${jenkinsUrl}`);

  const resolveScript = (filename) => {
    const candidates = [
      path.resolve(__dirname, '../ci/jenkins', filename),
      path.resolve(__dirname, '../../ci/jenkins', filename),
      path.resolve(__dirname, '../../scripts/jenkins', filename),
      path.resolve(process.cwd(), 'ci/jenkins', filename),
      path.resolve(process.cwd(), 'scripts/jenkins', filename),
      path.resolve(process.cwd(), 'dps_backend/ci/jenkins', filename),
      path.resolve(process.cwd(), 'superapp_backend/ci/jenkins', filename),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return filename;
  };

  await syncJob('miniapp-validation', resolveScript('Jenkinsfile.miniapp-validation'));
  await syncJob('miniapp-validation-webview', resolveScript('Jenkinsfile.webview-validation'));
  await syncJob('miniapp-validation-flutter-package', resolveScript('Jenkinsfile.package-validation'));
  await syncJob('miniapp-validation-native-sdk', resolveScript('Jenkinsfile.nativesdk-validation'));
  await syncJob('miniapp-validation-deep-link', resolveScript('Jenkinsfile.deeplink-validation'));
  await syncJob('superapp-sandbox-build', resolveScript('Jenkinsfile.superapp-sandbox-build'));
  await syncJob('superapp-test-build', resolveScript('Jenkinsfile.superapp-test-build'));
  console.log('✨ All Jenkins jobs processed successfully.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
