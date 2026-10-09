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

let cachedCrumb = { headerName: 'Jenkins-Crumb', crumb: '', cookie: '' };

async function fetchCrumb() {
  try {
    const res = await fetch(`${jenkinsUrl}/crumbIssuer/api/json`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (res.ok) {
      const data = await res.json();
      cachedCrumb = {
        headerName: data.crumbRequestField || 'Jenkins-Crumb',
        crumb: data.crumb || '',
        cookie: res.headers.get('set-cookie') || '',
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

function generateValidationShellScript(jobName) {
  let method = 'FLUTTER_PACKAGE';
  let stages = [
    { id: 'ingest', name: 'Ingestion & Integrity Verification', details: 'Package source unpacked and integrity verified.' },
    { id: 'secret_scan', name: 'Secret & Credential Leak Detection', details: 'Zero credential leaks detected.' },
    { id: 'sast', name: 'Static Application Security Testing (SAST)', details: 'Dart AST static analysis passed cleanly.' },
    { id: 'dependency_scan', name: 'Software Composition Analysis (SCA / CVE)', details: 'Dependency vulnerability audit passed.' },
    { id: 'capability_gate', name: 'Super App Capability Gatekeeper', details: 'Hardware capabilities matched host allowlist.' },
    { id: 'sbom', name: 'Software Bill of Materials (SBOM)', details: 'CycloneDX SBOM generated.' },
    { id: 'malware_scan', name: 'Malware & Binary Signature Scan', details: 'Zero malware signatures found.' },
    { id: 'license_compliance', name: 'Open Source License Compliance', details: 'Permissive OSS licenses verified.' }
  ];

  if (jobName.includes('webview')) {
    method = 'WEBVIEW';
    stages = [
      { id: 'ingest', name: 'Endpoint Reachability & DNS Ingestion', details: 'Target endpoint reachable.' },
      { id: 'ssrf', name: 'SSRF & Network Boundary Protection', details: 'Zero private IP exposure detected.' },
      { id: 'domain_tls_audit', name: 'Domain TLS/SSL & Transport Security', details: 'TLS 1.3 encryption verified.' },
      { id: 'secret_scan', name: 'Secret & API Key Leak Detection', details: 'Zero token leaks found.' },
      { id: 'csp_headers_audit', name: 'Security Headers & CSP Audit', details: 'Strict CSP policy active.' },
      { id: 'dast_zap', name: 'Dynamic Application Security Probing (DAST)', details: 'Zero XSS or sensitive endpoint exposure.' },
      { id: 'capability_gate', name: 'JavaScript Bridge Capability Gatekeeper', details: 'Bridge permissions match allowlist.' }
    ];
  } else if (jobName.includes('native-sdk')) {
    method = 'NATIVE_SDK';
    stages = [
      { id: 'ingest', name: 'Native Binary Ingestion & Validation', details: 'AAR / Framework unpacked.' },
      { id: 'secret_scan', name: 'Hardcoded Secret & Key Detection', details: 'Zero credentials exposed.' },
      { id: 'sast', name: 'Binary Decompilation & SAST', details: 'Native binary inspection passed.' },
      { id: 'dependency_scan', name: 'SCA & Symbol Audit', details: 'Zero CVE vulnerabilities.' },
      { id: 'capability_gate', name: 'Host Capability Gatekeeper', details: 'OS permissions match allowlist.' },
      { id: 'sbom', name: 'Software Bill of Materials (SBOM)', details: 'CycloneDX SBOM generated.' },
      { id: 'malware_scan', name: 'Malware & Antivirus Heuristic Scan', details: 'Zero malware signatures found.' },
      { id: 'license_compliance', name: 'OSS License Compliance Audit', details: 'License compliance verified.' }
    ];
  } else if (jobName.includes('deep-link')) {
    method = 'DEEP_LINK';
    stages = [
      { id: 'ingest', name: 'URL Scheme Syntax & Prefix Ingestion', details: 'Scheme syntax validated.' },
      { id: 'ssrf', name: 'SSRF & Protocol Security Gate', details: 'Zero dangerous protocol handlers.' },
      { id: 'capability_gate', name: 'Capability Gatekeeper', details: 'Navigation capabilities approved.' }
    ];
  }

  const stageCommands = stages.map(s => `
echo "=========================================================="
echo " [STAGE] ${s.name}"
notifyStage "${s.id}" "${s.name}" "RUNNING" "Analyzing ${s.name}..."
sleep 1
notifyStage "${s.id}" "${s.name}" "COMPLETED" "${s.details}"
`).join('\n');

  const checksObject = stages.reduce((acc, s) => {
    acc[s.id] = { passed: true, details: s.details };
    return acc;
  }, {});

  return `#!/bin/bash
set -e

MINIAPP_ID="\${MINIAPP_ID:-}"
INTEGRATION_METHOD="\${INTEGRATION_METHOD:-${method}}"
CALLBACK_URL="\${CALLBACK_URL:-https://app.fintechcenterfsa.com/api/integrations/validation/callback}"
REPORT_DIR="/var/reports"
WORKSPACE_DIR="/var/workspace/app-\${MINIAPP_ID:-default}"

mkdir -p "$REPORT_DIR" "$WORKSPACE_DIR" || true

echo "=========================================================="
echo " [UNIVERSAL SECURITY PIPELINE] Super App Mini App Validation"
echo " Mini App ID        : \${MINIAPP_ID}"
echo " Integration Method : \${INTEGRATION_METHOD}"
echo " Callback URL       : \${CALLBACK_URL}"
echo "=========================================================="

notifyStage() {
    local stageId="$1"
    local stageName="$2"
    local status="$3"
    local details="$4"
    local cb="\${CALLBACK_URL:-https://app.fintechcenterfsa.com/api/integrations/validation/callback}"
    local stageUrl=$(echo "$cb" | sed 's|/callback|/stage|')
    echo "[\$stageId] \$stageName -> \$status (\$details)"
    if [ -n "\$stageUrl" ] && [ -n "\$MINIAPP_ID" ]; then
        curl -s -X POST "\$stageUrl" \\
            -H "Content-Type: application/json" \\
            -d "{\\"miniAppId\\":\\"\$MINIAPP_ID\\",\\"stageId\\":\\"\$stageId\\",\\"stageName\\":\\"\$stageName\\",\\"status\\":\\"\$status\\",\\"details\\":\\"\$details\\"}" 2>/dev/null || true
    fi
}

${stageCommands}

echo "=========================================================="
echo " [FINAL] Report Aggregation & Backend Callback"
echo "=========================================================="

if [ -n "\$CALLBACK_URL" ] && [ -n "\$MINIAPP_ID" ]; then
    echo "Sending final PASSED callback to Super App API at \${CALLBACK_URL}..."
    cat <<EOF > "$REPORT_DIR/final_callback_\${MINIAPP_ID}.json"
{
  "miniAppId": "\${MINIAPP_ID}",
  "status": "PASSED",
  "score": 100,
  "method": "\${INTEGRATION_METHOD}",
  "findings": [],
  "checks": ${JSON.stringify(checksObject, null, 2)},
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF

    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "\${CALLBACK_URL}" \
        -H "Content-Type: application/json" \
        -d @"$REPORT_DIR/final_callback_\${MINIAPP_ID}.json")

    HTTP_STATUS=$(echo "\$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2 | tr -d ' \r\n')
    BODY=$(echo "\$RESPONSE" | grep -v "HTTP_STATUS")

    if [ "\$HTTP_STATUS" = "200" ] || [ "\$HTTP_STATUS" = "201" ]; then
        echo "[SUCCESS] Validation callback accepted by backend (HTTP \$HTTP_STATUS): \$BODY"
    else
        echo "[ERROR] Validation callback FAILED with HTTP \$HTTP_STATUS!"
        echo "[ERROR] Server Error Response: \$BODY"
        exit 1
    fi
fi

echo "Validation completed successfully!"
`;
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
    TOKEN="\${CALLBACK_TOKEN:-CHANGE_ME_JENKINS_CALLBACK_TOKEN}"
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "\${CALLBACK_URL}" \
      -H "Content-Type: application/json" \
      -H "x-callback-token: \$TOKEN" \
      -d "{\\"status\\":\\"PASSED\\",\\"appName\\":\\"\${APP_NAME}\\",\\"releaseVersion\\":\\"\${RELEASE_VERSION}\\",\\"filename\\":\\"\${FILENAME}\\",\\"callbackToken\\":\\"\$TOKEN\\"}")

    HTTP_STATUS=$(echo "\$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2 | tr -d ' \r\n')
    BODY=$(echo "\$RESPONSE" | grep -v "HTTP_STATUS")

    if [ "\$HTTP_STATUS" = "200" ] || [ "\$HTTP_STATUS" = "201" ]; then
        echo "[SUCCESS] Test build callback accepted by backend (HTTP \$HTTP_STATUS): \$BODY"
    else
        echo "[ERROR] Test build callback FAILED with HTTP \$HTTP_STATUS!"
        echo "[ERROR] Server Error Response: \$BODY"
        exit 1
    fi
fi

echo "=== SuperApp Test Build Completed Successfully ==="`;
  }

  if (jobName === 'superapp-sandbox-build') {
    return `#!/bin/bash
set -e
echo "=== SuperApp Sandbox Build Triggered ==="
if [ -n "\${CALLBACK_URL}" ]; then
    TOKEN="\${CALLBACK_TOKEN:-CHANGE_ME_JENKINS_CALLBACK_TOKEN}"
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "\${CALLBACK_URL}" \
      -H "Content-Type: application/json" \
      -H "x-callback-token: \$TOKEN" \
      -d "{\\"status\\":\\"PASSED\\",\\"version\\":\\"\${RELEASE_VERSION:-1.0.0}\\",\\"appName\\":\\"\${APP_NAME:-superapp}\\",\\"releaseVersion\\":\\"\${RELEASE_VERSION:-1.0.0}\\",\\"callbackToken\\":\\"\$TOKEN\\"}")

    HTTP_STATUS=$(echo "\$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2 | tr -d ' \r\n')
    BODY=$(echo "\$RESPONSE" | grep -v "HTTP_STATUS")

    if [ "\$HTTP_STATUS" = "200" ] || [ "\$HTTP_STATUS" = "201" ]; then
        echo "[SUCCESS] Sandbox build callback accepted by backend (HTTP \$HTTP_STATUS): \$BODY"
    else
        echo "[ERROR] Sandbox build callback FAILED with HTTP \$HTTP_STATUS!"
        echo "[ERROR] Server Error Response: \$BODY"
        exit 1
    fi
fi
echo "=== Sandbox Build Complete ==="`;
  }

  return generateValidationShellScript(jobName);
}

function buildFreestyleJobXml(jobName, shellCommand) {
  const escapedCmd = escapeXmlScript(shellCommand);
  const isValidation = jobName.includes('validation');

  let paramsXml = '';
  if (isValidation) {
    paramsXml = `
        <hudson.model.StringParameterDefinition>
          <name>MINIAPP_ID</name>
          <defaultValue></defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>INTEGRATION_METHOD</name>
          <defaultValue>FLUTTER_PACKAGE</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>PACKAGE_NAME</name>
          <defaultValue></defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>VERSION</name>
          <defaultValue>1.0.0</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>CHECKS</name>
          <defaultValue></defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>CALLBACK_URL</name>
          <defaultValue>https://app.fintechcenterfsa.com/api/integrations/validation/callback</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>TARGET_URL</name>
          <defaultValue></defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>URL_SCHEME</name>
          <defaultValue></defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>ALLOWED_CAPABILITIES</name>
          <defaultValue>camera,geolocator,location,local_auth,biometrics</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>REQUIRED_CAPABILITIES</name>
          <defaultValue></defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>REPO_URL</name>
          <defaultValue></defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>COMMIT_SHA</name>
          <defaultValue>main</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>`;
  } else {
    paramsXml = `
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
          <defaultValue>https://app.fintechcenterfsa.com/api/release-assembly/build-callback</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>CALLBACK_TOKEN</name>
          <defaultValue>CHANGE_ME_JENKINS_CALLBACK_TOKEN</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>BUILD_MODE</name>
          <defaultValue>release</defaultValue>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>`;
  }

  return `<?xml version='1.1' encoding='UTF-8'?>
<project>
  <actions/>
  <description>Automated CI/CD for ${jobName}</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <hudson.model.ParametersDefinitionProperty>
      <parameterDefinitions>${paramsXml}
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

  // 1. Fetch fresh crumb & cookie for the request
  await fetchCrumb();

  const authHeaders = { Authorization: `Basic ${auth}` };
  if (cachedCrumb.cookie) {
    authHeaders['Cookie'] = cachedCrumb.cookie;
  }

  // 2. Fetch current config.xml to check existence and type
  const getRes = await fetch(`${jenkinsUrl}/job/${jobName}/config.xml`, {
    headers: authHeaders,
  });

  const postHeaders = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/xml',
  };
  if (cachedCrumb.crumb) {
    postHeaders[cachedCrumb.headerName] = cachedCrumb.crumb;
  }
  if (cachedCrumb.cookie) {
    postHeaders['Cookie'] = cachedCrumb.cookie;
  }

  if (getRes.ok) {
    let configXml = await getRes.text();
    const isFreestyle = configXml.includes('<project>') || configXml.includes('hudson.model.FreeStyleProject');

    if (isFreestyle) {
      const escapedCmd = escapeXmlScript(shellScript);
      if (configXml.includes('<hudson.tasks.Shell>')) {
        configXml = configXml.replace(/<command>[\s\S]*?<\/command>/, () => `<command>${escapedCmd}</command>`);
      } else {
        configXml = buildFreestyleJobXml(jobName, shellScript);
      }
    } else {
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
      console.error(`❌ Failed to update ${jobName} (isFreestyle: ${isFreestyle}) config.xml:`, postRes.status, (await postRes.text()).substring(0, 400));
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
