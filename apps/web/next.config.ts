import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@meridiano/domain', '@meridiano/application'],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
