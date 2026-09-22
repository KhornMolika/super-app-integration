import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: [
    '10.213.43.143',
    '10.213.43.143:3000',
    '10.213.43.143:3001',
    '10.213.43.143:3002',
    '10.213.43.*',
    '10.213.*',
    '10.*',
    '172.20.64.1',
    '172.20.*',
    '172.*',
    '192.168.10.35',
    '192.168.*',
    '10.0.2.2',
    'localhost',
    'localhost:3000',
    'localhost:3001',
    'localhost:3002',
    '127.0.0.1',
    '127.0.0.1:3000',
    '127.0.0.1:3001',
    '127.0.0.1:3002',
    '*.local',
    '*.orb.local',
  ],
};

export default nextConfig;
