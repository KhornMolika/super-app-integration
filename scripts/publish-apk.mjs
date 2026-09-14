import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const mobileAppDir = path.join(projectRoot, 'dps_mobile_app');
const apkPath = path.join(mobileAppDir, 'build', 'app', 'outputs', 'flutter-apk', 'app-debug.apk');

const version = process.env.VERSION || 'v0.0.1';
const appName = process.env.APP_NAME || 'superapp';
const repoName = process.env.REPO_NAME || 'apk-test-builds';
const nexusUrl = process.env.NEXUS_URL || 'http://localhost:8081';
const nexusUser = process.env.NEXUS_USER || 'admin';
const nexusPassword = process.env.NEXUS_PASSWORD || 'admin123';

console.log('==========================================');
console.log('Super App APK Build & Nexus Publisher');
console.log(`App Name    : ${appName}`);
console.log(`Version     : ${version}`);
console.log(`Repository  : ${repoName}`);
console.log(`Nexus URL   : ${nexusUrl}`);
console.log('==========================================');

console.log('\n📦 Compiling Flutter Debug APK...');
execSync('flutter build apk --debug', { cwd: mobileAppDir, stdio: 'inherit' });

if (!fs.existsSync(apkPath)) {
  console.error(`❌ APK file not found at ${apkPath}`);
  process.exit(1);
}

const stats = fs.statSync(apkPath);
console.log(`\n✓ Found APK: ${apkPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

const uploadUrl = `${nexusUrl}/repository/${repoName}/${appName}/${version}/app-debug.apk`;
console.log(`\n📤 Uploading APK to Nexus: ${uploadUrl}...`);

try {
  const auth = Buffer.from(`${nexusUser}:${nexusPassword}`).toString('base64');
  const apkData = fs.readFileSync(apkPath);
  
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/vnd.android.package-archive',
    },
    body: apkData,
  });

  if (res.ok) {
    console.log(`✅ Successfully published ${appName} (${version}) to Nexus (${repoName})!`);
  } else {
    console.error(`❌ Failed to upload to Nexus: ${res.status} ${res.statusText}`);
  }
} catch (err) {
  console.error('Upload error:', err);
}

console.log('\n🔄 Syncing APK into Jenkins container if running...');
try {
  execSync(`docker cp "${apkPath}" jenkins-controller:/var/reports/app-debug.apk`, { stdio: 'ignore' });
  console.log('✅ Jenkins container /var/reports/app-debug.apk updated!');
} catch (_) {
  console.log('ℹ️ (Optional) Jenkins container not running or docker cp skipped.');
}

console.log('\n🎉 All done! You can now download the latest APK from the Backoffice portal or Nexus directly.');
