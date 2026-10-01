import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface NetItem {
  name: string;
  address: string;
  family: string;
  isPrimary: boolean;
  score: number;
}

export async function GET(request: NextRequest) {
  const interfaces = os.networkInterfaces();
  const detectedIps: NetItem[] = [];

  // Find all non-internal IPv4 addresses
  for (const [name, nets] of Object.entries(interfaces)) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) {
        const lowerName = name.toLowerCase();
        const isVirtual =
          lowerName.includes('vethernet') ||
          lowerName.includes('wsl') ||
          lowerName.includes('hyper-v') ||
          lowerName.includes('virtual') ||
          lowerName.includes('docker') ||
          lowerName.includes('vmware') ||
          lowerName.includes('vmnet');

        const isWifi =
          lowerName.includes('wi-fi') ||
          lowerName.includes('wifi') ||
          lowerName.includes('wlan') ||
          lowerName.includes('wireless');

        const isEthernet =
          lowerName.includes('ethernet') ||
          lowerName.includes('eth') ||
          lowerName.includes('en');

        let score = 10;
        if (net.address.startsWith('192.168.')) score += 50;
        else if (net.address.startsWith('10.')) score += 40;
        else if (net.address.startsWith('172.16.')) score += 20;

        if (isWifi && !isVirtual) score += 60;
        else if (isEthernet && !isVirtual) score += 40;

        if (isVirtual) score -= 50;

        detectedIps.push({
          name,
          address: net.address,
          family: net.family,
          isPrimary: false,
          score,
        });
      }
    }
  }

  // Sort by score descending so real Wi-Fi/Ethernet is first
  detectedIps.sort((a, b) => b.score - a.score);

  let primaryIp = detectedIps.length > 0 ? detectedIps[0].address : '127.0.0.1';

  // If request host has a custom IP (e.g. user navigated to http://192.168.1.4:3002), prioritize that!
  const reqHost = request.headers.get('host') || '';
  const reqHostname = reqHost.split(':')[0];
  if (
    reqHostname &&
    reqHostname !== 'localhost' &&
    reqHostname !== '127.0.0.1' &&
    reqHostname !== '0.0.0.0'
  ) {
    primaryIp = reqHostname;
  }

  // Mark primary
  detectedIps.forEach((item) => {
    item.isPrimary = item.address === primaryIp;
  });

  // If list is empty, provide fallback
  if (detectedIps.length === 0) {
    detectedIps.push({
      name: 'Loopback',
      address: '127.0.0.1',
      family: 'IPv4',
      isPrimary: true,
      score: 0,
    });
  }

  const backofficePort = reqHost.includes(':') ? reqHost.split(':')[1] : '3002';
  const backendPort = process.env.BACKEND_PORT || '3000';

  let apkExists = false;
  let apkSizeMb = '19.44 MB';
  let apkFilename = 'superapp-test.apk';
  let apkVersion = 'v0.2.0';
  let isRelease = true;
  let lastModified: string | null = null;
  let availableVersions: Array<{
    version: string;
    size: string;
    buildMode: 'release' | 'debug';
    lastModified: string;
    downloadUrl: string;
  }> = [];

  // 1. Query Sonatype Nexus directly for live, accurate APK releases
  const nexusBase = (
    process.env.NEXUS_BASE_URL ||
    process.env.NEXUS_URL ||
    'http://localhost:8081'
  ).replace(/\/+$/, '');
  const adminUser = process.env.NEXUS_ADMIN_USER || 'admin';
  const adminPass = process.env.NEXUS_ADMIN_PASSWORD || 'admin123';
  const b64 = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

  try {
    const nexusController = new AbortController();
    const timeoutId = setTimeout(() => nexusController.abort(), 2000);
    const nexusRes = await fetch(
      `${nexusBase}/service/rest/v1/search/assets?repository=apk-test-builds`,
      {
        headers: { Authorization: `Basic ${b64}` },
        signal: nexusController.signal,
        cache: 'no-store',
      },
    );
    clearTimeout(timeoutId);

    if (nexusRes.ok) {
      const nexusData = await nexusRes.json();
      const assets = (nexusData.items || []).filter((item: any) =>
        item.path?.endsWith('.apk'),
      );

      const versionMap = new Map<string, any>();
      for (const asset of assets) {
        // e.g. path: /superapp/v0.2.0/app-release.apk
        const match = asset.path.match(/\/superapp\/(v\d+\.\d+\.\d+|latest)\/(app-(release|debug)\.apk)/);
        if (match) {
          const ver = match[1];
          const mode = match[3] as 'release' | 'debug';
          const sizeBytes = asset.fileSize || 0;
          const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
          const isRel = mode === 'release' || sizeBytes < 50 * 1024 * 1024;

          if (!versionMap.has(ver) || mode === 'release') {
            versionMap.set(ver, {
              version: ver,
              filename: match[2],
              size: sizeMb,
              sizeBytes,
              buildMode: isRel ? 'release' : 'debug',
              lastModified: asset.lastModified || asset.blobUpdated,
            });
          }
        }
      }

      // Sort versions semver descending, placing real versions above 'latest'
      const verList = Array.from(versionMap.values()).filter((v) => v.version !== 'latest');
      verList.sort((a, b) => {
        const vA = a.version.replace(/^v/, '').split('.').map(Number);
        const vB = b.version.replace(/^v/, '').split('.').map(Number);
        for (let i = 0; i < 3; i++) {
          if ((vB[i] || 0) !== (vA[i] || 0)) {
            return (vB[i] || 0) - (vA[i] || 0);
          }
        }
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      });

      if (verList.length > 0) {
        const top = verList[0];
        apkExists = true;
        apkVersion = top.version;
        apkFilename = top.filename;
        apkSizeMb = top.size;
        isRelease = top.buildMode === 'release';
        lastModified = top.lastModified;
        availableVersions = verList.map((v) => ({
          version: v.version,
          size: v.size,
          buildMode: v.buildMode,
          lastModified: v.lastModified,
          downloadUrl: `/api/download-apk?version=${v.version}&type=${v.buildMode}`,
        }));
      }
    }
  } catch (_) {
    // Nexus query timed out or offline, fallback to local disk scan
  }

  // 2. Fallback: Scan public directory for latest local APK build
  if (!apkExists) {
    const publicDir = path.resolve(process.cwd(), 'public');
    try {
      if (fs.existsSync(publicDir)) {
        const files = fs.readdirSync(publicDir);
        const apkFiles = files.filter(
          (f) => f.endsWith('.apk') && f.startsWith('superapp-'),
        );

        const apkDetails = apkFiles
          .map((fn) => {
            try {
              const fullPath = path.join(publicDir, fn);
              const stats = fs.statSync(fullPath);
              const match = fn.match(/v(\d+\.\d+\.\d+)/);
              const ver = match ? `v${match[1]}` : null;
              // Releases are typically <50MB because of AOT compilation and tree-shaking
              const isRel = fn.includes('release') || stats.size < 50 * 1024 * 1024;
              return {
                filename: fn,
                version: ver,
                sizeBytes: stats.size,
                sizeMb: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                mtime: stats.mtime,
                isRelease: isRel,
              };
            } catch (_) {
              return null;
            }
          })
          .filter(Boolean) as Array<{
          filename: string;
          version: string | null;
          sizeBytes: number;
          sizeMb: string;
          mtime: Date;
          isRelease: boolean;
        }>;

        if (apkDetails.length > 0) {
          apkDetails.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
          const latest = apkDetails[0];
          apkExists = true;
          apkFilename = latest.filename;
          apkVersion = latest.version || 'v0.2.0';
          apkSizeMb = latest.sizeMb;
          isRelease = latest.isRelease;
          lastModified = latest.mtime.toISOString();
        }
      }
    } catch (_) {}
  }

  const proto = request.headers.get('x-forwarded-proto') || (reqHost.includes('fintechcenterfsa.com') ? 'https' : 'http');
  const isDomain = reqHostname.includes('fintechcenterfsa.com');
  const isHttps = proto === 'https' || isDomain;

  const cloudBase = 'https://app.fintechcenterfsa.com';
  const lanBase = `http://${primaryIp}:${backofficePort}`;
  const effectiveBase = isHttps ? cloudBase : lanBase;

  return NextResponse.json({
    primaryIp,
    port: backofficePort,
    backendPort,
    isProduction: isDomain || isHttps,
    protocol: proto,
    interfaces: detectedIps.map(({ name, address, family, isPrimary }) => ({
      name,
      address,
      family,
      isPrimary,
    })),
    environments: {
      cloud: {
        label: 'Production Cloud',
        domain: 'app.fintechcenterfsa.com',
        backendUrl: 'https://app.fintechcenterfsa.com/api',
        directUrl: `${cloudBase}/${apkFilename}`,
        apiDownloadUrl: `${cloudBase}/api/download-apk?version=${apkVersion}&type=${isRelease ? 'release' : 'test'}`,
        description: 'Accessible from any phone anywhere (4G / 5G / Wi-Fi). No LAN pairing needed.',
      },
      localLan: {
        label: 'Local Dev LAN',
        host: primaryIp,
        backendUrl: `http://${primaryIp}:${backendPort}`,
        directUrl: `${lanBase}/${apkFilename}`,
        apiDownloadUrl: `${lanBase}/api/download-apk?version=${apkVersion}&type=${isRelease ? 'release' : 'test'}`,
        description: 'Physical phone must be on the same office Wi-Fi as your development machine.',
      },
    },
    apk: {
      exists: apkExists,
      version: apkVersion,
      size: apkSizeMb,
      buildMode: isRelease ? 'release' : 'debug',
      filename: apkFilename,
      lastModified,
      downloadPath: `/api/download-apk?version=${apkVersion}&type=${isRelease ? 'release' : 'test'}`,
      staticPath: `/${apkFilename}`,
      directUrl: `${effectiveBase}/${apkFilename}`,
      apiDownloadUrl: `${effectiveBase}/api/download-apk?version=${apkVersion}&type=${isRelease ? 'release' : 'test'}`,
      availableVersions,
    },
    availableVersions,
    backend: {
      port: backendPort,
      baseUrl: isHttps ? 'https://app.fintechcenterfsa.com/api' : `http://${primaryIp}:${backendPort}`,
      mobileAuthUrl: isHttps ? 'https://app.fintechcenterfsa.com/api/mobile/auth/login' : `http://${primaryIp}:${backendPort}/api/mobile/auth/login`,
    },
    clientRequestHost: reqHost,
  });
}
