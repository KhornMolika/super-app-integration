import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: [
    '10.213.43.143',
    '10.213.43.*',
    '10.213.*',
    '10.*',
    '172.20.64.1',
    '172.20.*',
    '192.168.10.35',
    '192.168.*',
    '10.0.2.2',
    'localhost',
    '127.0.0.1',
    '*.local',
    '*.orb.local',
  ],
};

export default nextConfig;
