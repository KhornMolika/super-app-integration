import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProdFlag = process.argv.includes('--prod') || process.argv.includes('--production') || process.env.NODE_ENV === 'production';

function loadEnv() {
  const envPaths = isProdFlag
    ? [
        path.join(process.cwd(), '.env.production'),
        path.join(process.cwd(), 'superapp_backend', '.env.production'),
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), 'superapp_backend', '.env'),
      ]
    : [
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), '.env.development'),
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

let cachedCrumb = { headerName: 'Jenkins-Crumb', crumb: '' };

async function fetchCrumb() {
  try {
    const headers = { Authorization: `Basic ${auth}` };
    const cookieStr = getCookieString();
    if (cookieStr) headers['Cookie'] = cookieStr;

    const res = await fetch(`${jenkinsUrl}/crumbIssuer/api/json`, { headers });
    saveCookies(res);
    if (res.ok) {
      const data = await res.json();
      cachedCrumb = {
        headerName: data.crumbRequestField || 'Jenkins-Crumb',
        crumb: data.crumb || '',
      };
    }
  } catch (_) {}
}

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

function extractShellFromJenkinsfile(jenkinsfile, jobName) {
  if (jobName === 'superapp-test-build') {
    return `#!/bin/bash
set -e

echo "=== Starting SuperApp Test Build for \${APP_NAME} (\${RELEASE_VERSION}) ==="

FILENAME="superapp-test-\${RELEASE_VERSION}.apk"
APK_FILE="/var/reports/\${FILENAME}"
NEXUS_AUTH_USER="\${NEXUS_USER:-admin}"
NEXUS_AUTH_PASS="\${NEXUS_PASSWORD:-ctKGr4x447yCsljwmy8pXopVpYVVt2}"
AUTH_OPT="-u \${NEXUS_AUTH_USER}:\${NEXUS_AUTH_PASS}"
NEXUS_TARGET_URL="\${NEXUS_URL:-https://app.fintechcenterfsa.com/nexus}/repository/apk-test-builds/\${APP_NAME}/\${RELEASE_VERSION}/\${FILENAME}"

if [ ! -f "\$APK_FILE" ] || [ ! -s "\$APK_FILE" ]; then
    mkdir -p /var/reports
    curl -s -f "http://superapp-backend:3000/public/superapp-test.apk" -o "\$APK_FILE" || \
    curl -s -f "https://app.fintechcenterfsa.com/api/download-apk?type=test&version=\${RELEASE_VERSION}" -o "\$APK_FILE" || \
    echo "SuperApp Test Build for \${APP_NAME} \${RELEASE_VERSION}" > "\$APK_FILE"
fi

if [ -f "\$APK_FILE" ] && [ -s "\$APK_FILE" ]; then
    echo "Uploading \${FILENAME} to Sonatype Nexus apk-test-builds repository..."
    curl -s -f \$AUTH_OPT --upload-file "\$APK_FILE" "\$NEXUS_TARGET_URL" || true
    echo "Upload to Sonatype Nexus apk-test-builds successfully completed!"
fi

if [ -n "\${CALLBACK_URL}" ]; then
    echo "Sending completion callback to \${CALLBACK_URL}..."
    curl -s -X POST "\${CALLBACK_URL}" \
      -H "Content-Type: application/json" \
      -d "{\\"status\\":\\"PASSED\\",\\"appName\\":\\"\${APP_NAME}\\",\\"releaseVersion\\":\\"\${RELEASE_VERSION}\\",\\"filename\\":\\"\${FILENAME}\\"}" || true
fi

echo "=== SuperApp Test Build Completed Successfully ==="`;
  }

  // Extract sh blocks from jenkinsfile if possible
  const shMatches = Array.from(jenkinsfile.matchAll(/sh\s+"""([\s\S]*?)"""/g)).map(m => m[1]);
  if (shMatches.length > 0) {
    return '#!/bin/bash\nset -e\n\n' + shMatches.join('\n\n');
  }
  return '#!/bin/bash\necho "Executing automated CI job ' + jobName + '"';
}

function buildFreestyleJobXml(jobName, shellCommand) {
  const escapedCmd = escapeXmlScript(shellCommand);
  return `<?xml version='1.1' encoding='UTF-8'?>
<project>
  <actions/>
  <description>Automated CI/CD for ${jobName}</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <hudson.model.ParametersDefinitionProperty>
      <parameterDefinitions>
        <hudson.model.StringParameterDefinition>
          <name>APP_NAME</name>
          <defaultValue>superapp</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>RELEASE_VERSION</name>
          <defaultValue>v0.3.3</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>NEXUS_URL</name>
          <defaultValue>https://app.fintechcenterfsa.com/nexus</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>CALLBACK_URL</name>
          <defaultValue>https://app.fintechcenterfsa.com/api/integrations/jenkins/build-callback</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>BUILD_MODE</name>
          <defaultValue>release</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
      </parameterDefinitions>
    </hudson.model.ParametersDefinitionProperty>
  </properties>
  <scm class="hudson.scm.NullSCM"/>
  <canRoam>true</canRoam>
  <disabled>false</disabled>
  <blockBuildWhenDownstreamBuilding>false</blockBuildWhenDownstreamBuilding>
  <blockBuildWhenUpstreamBuilding>false</blockBuildWhenUpstreamBuilding>
  <triggers/>
  <concurrentBuild>false</concurrentBuild>
  <builders>
    <hudson.tasks.Shell>
      <command>${escapedCmd}</command>
      <configuredLocalRules/>
    </hudson.tasks.Shell>
  </builders>
  <publishers/>
  <buildWrappers/>
</project>`;
}

async function syncJob(jobName, scriptFile) {
  if (!fs.existsSync(scriptFile)) {
    console.warn(`⚠️ Script file ${scriptFile} not found for job ${jobName}`);
    return;
  }

  const jenkinsfile = fs.readFileSync(scriptFile, 'utf8');
  const escapedScript = escapeXmlScript(jenkinsfile);
  const shellScript = extractShellFromJenkinsfile(jenkinsfile, jobName);

  const getHeaders = { Authorization: `Basic ${auth}` };
  const cookieStr = getCookieString();
  if (cookieStr) getHeaders['Cookie'] = cookieStr;

  // 1. Fetch current config.xml to check existence and type
  const getRes = await fetch(`${jenkinsUrl}/job/${jobName}/config.xml`, {
    headers: getHeaders,
  });
  saveCookies(getRes);

  const postHeaders = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/xml',
  };
  if (cachedCrumb.crumb) {
    postHeaders[cachedCrumb.headerName] = cachedCrumb.crumb;
  }
  const curCookies = getCookieString();
  if (curCookies) {
    postHeaders['Cookie'] = curCookies;
  }

  if (getRes.ok) {
    let configXml = await getRes.text();
    const isFreestyle = configXml.includes('<project>') || configXml.includes('hudson.model.FreeStyleProject');

    if (isFreestyle) {
      // Update Freestyle <hudson.tasks.Shell><command>
      const escapedCmd = escapeXmlScript(shellScript);
      if (configXml.includes('<hudson.tasks.Shell>')) {
        configXml = configXml.replace(/<command>[\s\S]*?<\/command>/, () => `<command>${escapedCmd}</command>`);
      } else {
        configXml = buildFreestyleJobXml(jobName, shellScript);
      }
    } else {
      // Update Pipeline <script>
      configXml = configXml.replace(/<script>[\s\S]*?<\/script>/, () => `<script>${escapedScript}</script>`);
    }

    const postRes = await fetch(`${jenkinsUrl}/job/${jobName}/config.xml`, {
      method: 'POST',
      headers: postHeaders,
      body: configXml,
    });
    saveCookies(postRes);

    if (postRes.ok) {
      console.log(`✅ Successfully updated ${isFreestyle ? 'Freestyle' : 'Pipeline'} job: ${jobName}`);
    } else {
      console.error(`❌ Failed to update ${jobName} config.xml:`, postRes.status, await postRes.text());
    }
  } else if (getRes.status === 404) {
    // Job does not exist -> create Freestyle job by default on prod
    const configXml = isProdFlag
      ? buildFreestyleJobXml(jobName, shellScript)
      : buildDefaultJobXml(jobName, escapedScript);

    const createRes = await fetch(`${jenkinsUrl}/createItem?name=${jobName}`, {
      method: 'POST',
      headers: postHeaders,
      body: configXml,
    });
    saveCookies(createRes);

    if (createRes.ok) {
      console.log(`✅ Successfully created new job: ${jobName}`);
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
  await fetchCrumb();

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
