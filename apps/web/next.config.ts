import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@kenzo-ehs/ui',
    '@kenzo-ehs/types',
    '@kenzo-ehs/utils',
    '@kenzo-ehs/validation',
    '@kenzo-ehs/config',
  ],
};

export default nextConfig;
