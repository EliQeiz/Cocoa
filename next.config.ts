import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep Next's generated assets inside this repository even when another
  // package-lock exists higher in the Windows user directory.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: __dirname },
};
export default nextConfig;
