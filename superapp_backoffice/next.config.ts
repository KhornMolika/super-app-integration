import type { NextConfig } from "next";
import os from "os";

function getAllowedOrigins(): string[] {
  const origins = new Set<string>([
    'localhost',
    'localhost:3000',
    'localhost:3001',
    'localhost:3002',
    '127.0.0.1',
    '127.0.0.1:3000',
    '127.0.0.1:3001',
    '127.0.0.1:3002',
    '10.0.2.2',
    '10.0.2.2:3000',
    '10.0.2.2:3002',
    '*.local',
    '*.orb.local',
    'app.fintechcenterfsa.com',
  ]);

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4') {
          origins.add(net.address);
          origins.add(`${net.address}:3000`);
          origins.add(`${net.address}:3001`);
          origins.add(`${net.address}:3002`);
        }
      }
    }
  } catch {}

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  allowedDevOrigins: getAllowedOrigins(),
};

export default nextConfig;
