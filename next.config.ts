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

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@data': path.resolve(__dirname, 'src/data'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@hocs': path.resolve(__dirname, 'src/hocs'),
      '@lib/arrayUtils': path.resolve(__dirname, 'src/lib/arrayUtils'),
      '@lib/errorUtils': path.resolve(__dirname, 'src/lib/errorUtils'),
      '@lib/testUtils': path.resolve(__dirname, 'src/lib/testUtils'),
      '@lib/testData': path.resolve(__dirname, 'src/lib/testData'),
      '@lib/styledUtils': path.resolve(__dirname, 'src/lib/styledUtils'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@tokens': path.resolve(__dirname, 'src/tokens'),
      '@app-types': path.resolve(__dirname, 'src/types'),
      '@workers': path.resolve(__dirname, 'src/workers')
    };
    return config;
  },

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
