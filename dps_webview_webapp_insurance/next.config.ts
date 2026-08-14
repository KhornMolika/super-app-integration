import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ['10.0.2.2', '172.20.64.1'],
};

export default nextConfig;
