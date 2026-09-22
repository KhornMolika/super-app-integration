import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const NEXUS_BASE_URL = process.env.NEXUS_BASE_URL || 'http://localhost:8081';
const NEXUS_ADMIN_USER = process.env.NEXUS_ADMIN_USER || 'admin';
const NEXUS_ADMIN_PASSWORD = process.env.NEXUS_ADMIN_PASSWORD || '';
const PUB_HOSTED_URL = `${NEXUS_BASE_URL}/repository/pub-hosted`;

async function publishPackage(pkgDir, pkgName, version = '1.0.0') {
  console.log(`\n📦 Packaging and publishing "${pkgName}" to Nexus (${PUB_HOSTED_URL})...`);

  // 1. Create temporary directory for sanitized package
  const tempDir = path.join(os.tmpdir(), `nexus-pkg-${pkgName}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  // Copy lib, pubspec.yaml, README.md, etc.
  const srcLib = path.join(pkgDir, 'lib');
  if (fs.existsSync(srcLib)) {
    fs.cpSync(srcLib, path.join(tempDir, 'lib'), { recursive: true });
  }

  // Create sanitized pubspec.yaml for registry distribution
  const srcPubspec = path.join(pkgDir, 'pubspec.yaml');
  let pubspecContent = fs.readFileSync(srcPubspec, 'utf-8');

  // Remove publish_to: "none"
  pubspecContent = pubspecContent.replace(/publish_to:\s*["']?none["']?/g, '');
  // Remove path: ../dps_core_package or superapp_core or replace with version constraint if needed
  pubspecContent = pubspecContent.replace(/\s+(dps_core_package|superapp_core):\s+path:\s+[^\n]+/g, '');

  fs.writeFileSync(path.join(tempDir, 'pubspec.yaml'), pubspecContent, 'utf-8');

  // Create README.md if not exists
  const readmePath = path.join(tempDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, `# ${pkgName}\n\nNexus hosted package for Super App.\n`, 'utf-8');
  }

  // 2. Create .tar.gz archive
  const archivePath = path.join(os.tmpdir(), `${pkgName}-${version}.tar.gz`);
  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);

  console.log(`Creating tar.gz archive at ${archivePath}...`);
  execSync(`tar -czf "${archivePath}" *`, { cwd: tempDir, stdio: 'inherit' });

  // 3. Initiate Pub upload with Nexus
  console.log(`Fetching upload endpoint from ${PUB_HOSTED_URL}/api/packages/versions/new...`);
  const authHeader = NEXUS_ADMIN_PASSWORD
    ? { Authorization: 'Basic ' + Buffer.from(`${NEXUS_ADMIN_USER}:${NEXUS_ADMIN_PASSWORD}`).toString('base64') }
    : {};
  const initRes = await fetch(`${PUB_HOSTED_URL}/api/packages/versions/new`, {
    headers: {
      Accept: 'application/vnd.pub.v2+json',
      ...authHeader,
    },
  });

  if (!initRes.ok) {
    throw new Error(`Failed to initiate upload: HTTP ${initRes.status} ${initRes.statusText}`);
  }

  const initData = await initRes.json();
  const uploadUrl = initData.url || `${PUB_HOSTED_URL}/api/packages/versions/newUpload`;
  console.log(`Upload URL resolved: ${uploadUrl}`);

  // 4. Upload archive via multipart/form-data
  const fileBuffer = fs.readFileSync(archivePath);
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'application/gzip' });
  formData.append('file', blob, `${pkgName}-${version}.tar.gz`);

  if (initData.fields) {
    for (const [k, v] of Object.entries(initData.fields)) {
      formData.append(k, v);
    }
  }

  console.log(`Uploading ${fileBuffer.length} bytes to Nexus...`);
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
    headers: {
      ...authHeader,
    },
  });

  console.log(`Upload response: HTTP ${uploadRes.status}`);
  const uploadBody = await uploadRes.text();

  // Clean up
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
  } catch (_) {}

  // 5. Verify publication in Nexus
  console.log(`Checking package in Nexus registry...`);
  const verifyRes = await fetch(`${NEXUS_BASE_URL}/repository/pub-group/api/packages/${pkgName}`, {
    headers: { Accept: 'application/vnd.pub.v2+json' },
  });

  if (verifyRes.ok) {
    const pkgData = await verifyRes.json();
    console.log(`🎉 Package "${pkgName}" successfully verified on Nexus pub-group! Latest version: ${pkgData.latest?.version}`);
    return { success: true, package: pkgData };
  } else {
    console.log(`Verification returned HTTP ${verifyRes.status}:`, uploadBody);
    return { success: false, status: verifyRes.status, body: uploadBody };
  }
}

async function main() {
  const rootDir = process.cwd();
  const trustDir = fs.existsSync(path.join(rootDir, 'ma_flutter_trust_regulator'))
    ? path.join(rootDir, 'ma_flutter_trust_regulator')
    : path.join(rootDir, 'dsp_miniapp_trust_regulator');
  await publishPackage(trustDir, 'dps_miniapp_mobile_trust_regulator', '1.0.0');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
