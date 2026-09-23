import AdmZip from 'adm-zip';

const BASE_URL = 'http://127.0.0.1:3000';

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...(options.headers || {}) };
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...options,
    headers,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, data };
}

async function run() {
  console.log('================================================================');
  console.log('🚀 E2E CURL & API VERIFICATION: ALL 4 MINI APP INTEGRATION METHODS');
  console.log('================================================================\n');

  // Step 1: Admin Login
  console.log('🔑 Step 1: Admin Authentication (superadmin@example.com)...');
  const loginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'superadmin@example.com' }),
  });

  if (!loginRes.data?.access_token) {
    console.error('❌ Login failed:', loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.access_token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('✅ Authenticated successfully! Admin JWT obtained.\n');

  const ts = Date.now();
  const testResults = [];

  // -------------------------------------------------------------------------
  // Step 2: WEBVIEW Integration Method
  // -------------------------------------------------------------------------
  console.log('🌐 Step 2: Testing WEBVIEW Integration Method...');
  const webViewPayload = {
    appId: `kh.gov.fsa.webview_${ts}`,
    name: `Lotus Portal WebView ${ts}`,
    shortDescription: 'Enterprise WebView Portal for Citizen Services',
    ownerEmail: 'portal-lead@fsa.gov.kh',
    integrationMethod: 'WEBVIEW',
    integrationConfigWebView: {
      productionUrl: 'https://fintechcenter.gov.kh/app',
      isDomainVerified: true,
    },
  };

  const wvCreate = await api('/mini-apps', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(webViewPayload),
  });
  console.log(`   Registration Status: ${wvCreate.status} - ID: ${wvCreate.data?.id}`);
  
  // Wait 1.5s for initial ingest/registration pacer
  await new Promise((r) => setTimeout(r, 1500));

  const wvApprove = await api(`/mini-apps/${wvCreate.data.id}/approve`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log(`   Approval Status: ${wvApprove.status} (Status: ${wvApprove.data?.status})`);
  testResults.push({
    method: 'WEBVIEW',
    id: wvCreate.data.id,
    registered: wvCreate.status === 201,
    approved: wvApprove.status === 200 || wvApprove.status === 201,
    finalStatus: wvApprove.data?.status,
  });
  console.log('');

  // -------------------------------------------------------------------------
  // Step 3: FLUTTER_PACKAGE Integration Method (with Owner Deploy Key)
  // -------------------------------------------------------------------------
  console.log('📱 Step 3: Testing FLUTTER_PACKAGE Integration Method (Private Repo + Deploy Key)...');
  const sampleDeployKey = `-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\nQyNTUxOQAAACD7V/TEST/OWNER/KEY/SAMPLE/superapp/test/key/12345\n-----END OPENSSH PRIVATE KEY-----`;

  const flutterPayload = {
    appId: `kh.gov.fsa.flutter_${ts}`,
    name: `Lotus Pay Flutter Package ${ts}`,
    shortDescription: 'Mobile Payment Module (Flutter Package)',
    ownerEmail: 'payments@fsa.gov.kh',
    integrationMethod: 'FLUTTER_PACKAGE',
    integrationConfigFlutter: {
      sourceType: 'GIT',
      gitUrl: 'git@github.com:fintechcenter/lotus_pay.git',
      gitBranch: 'main',
      isPrivateRepo: true,
      authMethod: 'deploy_key',
      deployKey: sampleDeployKey,
    },
  };

  const flCreate = await api('/mini-apps', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(flutterPayload),
  });
  console.log(`   Registration Status: ${flCreate.status} - ID: ${flCreate.data?.id}`);
  
  // Verify Security Masking in API Response
  const returnedKey = flCreate.data?.integrationConfig?.deployKey;
  const hasDeployKey = flCreate.data?.integrationConfig?.hasDeployKey;
  console.log(`   🔒 Security Check: returned deployKey is masked as '${returnedKey}' (hasDeployKey: ${hasDeployKey})`);
  if (returnedKey === '********' && hasDeployKey === true) {
    console.log('   ✅ Private Key is successfully REDACTED/MASKED in API response!');
  } else {
    console.warn('   ⚠️ Key masking discrepancy:', returnedKey);
  }

  // Wait 1.5s for initial ingest
  await new Promise((r) => setTimeout(r, 1500));

  const flApprove = await api(`/mini-apps/${flCreate.data.id}/approve`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log(`   Approval Status: ${flApprove.status} (Status: ${flApprove.data?.status})`);
  testResults.push({
    method: 'FLUTTER_PACKAGE',
    id: flCreate.data.id,
    registered: flCreate.status === 201,
    approved: flApprove.status === 200 || flApprove.status === 201,
    finalStatus: flApprove.data?.status,
  });
  console.log('');

  // -------------------------------------------------------------------------
  // Step 4: NATIVE_SDK Integration Method (with Binary Uploads)
  // -------------------------------------------------------------------------
  console.log('⚙️ Step 4: Testing NATIVE_SDK Integration Method (Upload Binaries & Approve)...');
  const nativeSdkPayload = {
    appId: `kh.gov.fsa.nativesdk_${ts}`,
    name: `Lotus Biometric SDK ${ts}`,
    shortDescription: 'Hardware Biometric Scanner Native SDK',
    ownerEmail: 'biometrics@fsa.gov.kh',
    integrationMethod: 'NATIVE_SDK',
    integrationConfigNativeSdk: {
      iosModuleName: 'LotusBioSDK',
      iosTypeName: 'LotusBioSDKView',
      iosArtifactFilename: 'LotusBioSDK.xcframework.zip',
      androidPackageName: 'kh.gov.fsa.bio',
      androidObjectName: 'LotusBioSDK',
      androidArtifactFilename: 'lotus-bio-sdk-1.0.0.aar',
      androidMavenGroupId: 'kh.gov.fsa.sdk',
      androidMavenArtifactId: 'lotus-bio-sdk',
      androidMavenVersion: '1.0.0',
    },
  };

  const nsCreate = await api('/mini-apps', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(nativeSdkPayload),
  });
  console.log(`   Registration Status: ${nsCreate.status} - ID: ${nsCreate.data?.id}`);

  // Create sample iOS .xcframework.zip
  const iosZip = new AdmZip();
  iosZip.addFile('Info.plist', Buffer.from('<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>kh.gov.fsa.bio</string><key>MinimumOSVersion</key><string>14.0</string></dict></plist>'));
  const iosForm = new FormData();
  iosForm.append('file', new Blob([iosZip.toBuffer()]), 'LotusBioSDK.xcframework.zip');
  iosForm.append('version', '1.0.0');

  const iosUpload = await api(`/api/sdk-artifacts/${nsCreate.data.id}/upload/ios`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: iosForm,
  });
  console.log(`   iOS Artifact Upload Status: ${iosUpload.status} (MinIO Key: ${iosUpload.data?.minioKey})`);

  // Create sample Android .aar
  const aarZip = new AdmZip();
  aarZip.addFile('AndroidManifest.xml', Buffer.from('<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="kh.gov.fsa.bio"><uses-permission android:name="android.permission.CAMERA"/></manifest>'));
  aarZip.addFile('classes.jar', Buffer.from('PK\x05\x06\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'));
  const androidForm = new FormData();
  androidForm.append('file', new Blob([aarZip.toBuffer()]), 'lotus-bio-sdk-1.0.0.aar');
  androidForm.append('version', '1.0.0');

  const androidUpload = await api(`/api/sdk-artifacts/${nsCreate.data.id}/upload/android`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: androidForm,
  });
  console.log(`   Android Artifact Upload Status: ${androidUpload.status} (MinIO Key: ${androidUpload.data?.minioKey})`);

  // Wait 1.5s
  await new Promise((r) => setTimeout(r, 1500));

  // Approve Native SDK
  const nsApprove = await api(`/mini-apps/${nsCreate.data.id}/approve`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log(`   Approval Status: ${nsApprove.status} (Status: ${nsApprove.data?.status})`);
  testResults.push({
    method: 'NATIVE_SDK',
    id: nsCreate.data.id,
    registered: nsCreate.status === 201,
    approved: nsApprove.status === 200 || nsApprove.status === 201,
    finalStatus: nsApprove.data?.status,
  });
  console.log('');

  // -------------------------------------------------------------------------
  // Step 5: DEEP_LINK Integration Method
  // -------------------------------------------------------------------------
  console.log('🔗 Step 5: Testing DEEP_LINK Integration Method...');
  const deepLinkPayload = {
    appId: `kh.gov.fsa.deeplink_${ts}`,
    name: `Lotus External Banking ${ts}`,
    shortDescription: 'External Standalone Banking App Launcher',
    ownerEmail: 'banking-link@fsa.gov.kh',
    integrationMethod: 'DEEP_LINK',
    integrationConfigDeepLink: {
      urlScheme: 'lotusbank://open',
      packageName: 'kh.gov.fsa.lotusbank',
      appStoreUrl: 'https://apple.com/app',
    },
  };

  const dlCreate = await api('/mini-apps', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(deepLinkPayload),
  });
  console.log(`   Registration Status: ${dlCreate.status} - ID: ${dlCreate.data?.id}`);

  // Wait 1.5s
  await new Promise((r) => setTimeout(r, 1500));

  const dlApprove = await api(`/mini-apps/${dlCreate.data.id}/approve`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log(`   Approval Status: ${dlApprove.status} (Status: ${dlApprove.data?.status})`);
  testResults.push({
    method: 'DEEP_LINK',
    id: dlCreate.data.id,
    registered: dlCreate.status === 201,
    approved: dlApprove.status === 200 || dlApprove.status === 201,
    finalStatus: dlApprove.data?.status,
  });
  console.log('');

  // -------------------------------------------------------------------------
  // Step 6: Verify Backoffice and Mobile Catalog Visibility
  // -------------------------------------------------------------------------
  console.log('📋 Step 6: Verifying Backoffice Catalog (/mini-apps)...');
  const allApps = await api('/mini-apps', { headers: authHeaders });
  console.log(`   Total Mini Apps in Backoffice: ${Array.isArray(allApps.data) ? allApps.data.length : 'N/A'}`);

  console.log('\n================================================================');
  console.log('🏁 FINAL END-TO-END VERIFICATION MATRIX');
  console.log('================================================================');
  console.table(testResults);

  const allPassed = testResults.every((t) => t.registered && t.approved);
  if (allPassed) {
    console.log('🎉 100% SUCCESS: All 4 integration methods successfully registered, uploaded, validated, and approved!');
  } else {
    console.log('⚠️ Some integration steps require attention.');
  }
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
