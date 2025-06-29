import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true
  },
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')]
  },
  serverExternalPackages: ['flexsearch'],

  // Reduce noise during E2E testing
  logging:
    process.env.CYPRESS === 'true'
      ? {
          fetches: {
            fullUrl: false
          }
        }
      : undefined,

  // Suppress build warnings in test mode
  typescript: {
    ignoreBuildErrors: process.env.CYPRESS === 'true'
  },

  eslint: {
    ignoreDuringBuilds: process.env.CYPRESS === 'true'
  },

  async headers() {
    return [];
  }
};

export default nextConfig;
