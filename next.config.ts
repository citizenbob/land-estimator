import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true
  },
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')]
  },
  // Include public files in serverless functions
  experimental: {
    serverComponentsExternalPackages: ['flexsearch']
  },
  async headers() {
    return [
      // FlexSearch index headers removed - clients now use /api/lookup endpoint
    ];
  }
};

export default nextConfig;
