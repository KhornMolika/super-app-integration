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

  // Check local APK size and presence
  const publicApkPath = path.resolve(process.cwd(), 'public/superapp-test.apk');
  let apkSizeMb = '19.12 MB';
  let apkExists = false;
  let lastModified: string | null = null;

  try {
    if (fs.existsSync(publicApkPath)) {
      const stats = fs.statSync(publicApkPath);
      apkExists = true;
      apkSizeMb = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
      lastModified = stats.mtime.toISOString();
    }
  } catch (_) {}

  return NextResponse.json({
    primaryIp,
    port: backofficePort,
    backendPort,
    interfaces: detectedIps.map(({ name, address, family, isPrimary }) => ({
      name,
      address,
      family,
      isPrimary,
    })),
    apk: {
      exists: apkExists,
      size: apkSizeMb,
      filename: 'superapp-test.apk',
      lastModified,
      downloadPath: '/api/download-apk',
      staticPath: '/superapp-test.apk',
      directUrl: `http://${primaryIp}:${backofficePort}/superapp-test.apk`,
      apiDownloadUrl: `http://${primaryIp}:${backofficePort}/api/download-apk`,
    },
    backend: {
      port: backendPort,
      baseUrl: `http://${primaryIp}:${backendPort}`,
      mobileAuthUrl: `http://${primaryIp}:${backendPort}/api/mobile/auth/login`,
    },
    clientRequestHost: reqHost,
  });
}
