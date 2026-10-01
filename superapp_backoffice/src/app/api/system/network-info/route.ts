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

  // Dynamically scan public directory for latest APK builds
  const publicDir = path.resolve(process.cwd(), 'public');
  let apkExists = false;
  let apkSizeMb = '19.12 MB';
  let apkFilename = 'superapp-test.apk';
  let apkVersion = 'v0.1.3';
  let isRelease = false;
  let lastModified: string | null = null;

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
        // Sort by version (highest first), then by modification time
        apkDetails.sort((a, b) => {
          if (a.version && b.version) {
            const vA = a.version.replace(/^v/, '').split('.').map(Number);
            const vB = b.version.replace(/^v/, '').split('.').map(Number);
            for (let i = 0; i < 3; i++) {
              if ((vB[i] || 0) !== (vA[i] || 0)) {
                return (vB[i] || 0) - (vA[i] || 0);
              }
            }
          }
          return b.mtime.getTime() - a.mtime.getTime();
        });

        const latest = apkDetails[0];
        apkExists = true;
        apkFilename = latest.filename;
        apkVersion = latest.version || 'v0.1.3';
        apkSizeMb = latest.sizeMb;
        isRelease = latest.isRelease;
        lastModified = latest.mtime.toISOString();
      }
    }
  } catch (_) {}

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
    },
    backend: {
      port: backendPort,
      baseUrl: isHttps ? 'https://app.fintechcenterfsa.com/api' : `http://${primaryIp}:${backendPort}`,
      mobileAuthUrl: isHttps ? 'https://app.fintechcenterfsa.com/api/mobile/auth/login' : `http://${primaryIp}:${backendPort}/api/mobile/auth/login`,
    },
    clientRequestHost: reqHost,
  });
}
