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

  webpack: (config, { isServer }) => {
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

    // Exclude Node.js-only scripts from client-side bundle
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        // Exclude Node.js filesystem modules from browser bundle
        fs: 'commonjs fs',
        path: 'commonjs path',
        zlib: 'commonjs zlib',
        crypto: 'commonjs crypto',

        // Exclude server-side file system loader
        '@lib/fileSystemLoader': 'commonjs @lib/fileSystemLoader',

        // Exclude Node.js-only script files
        './src/config/scripts/create_emergency_backups':
          'commonjs ./src/config/scripts/create_emergency_backups',
        './src/config/scripts/debug-static-loading':
          'commonjs ./src/config/scripts/debug-static-loading',
        './src/config/scripts/flexsearch_builder':
          'commonjs ./src/config/scripts/flexsearch_builder',
        './src/config/scripts/upload_blob':
          'commonjs ./src/config/scripts/upload_blob'
      });
    }

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
