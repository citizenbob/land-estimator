import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
      '@app': path.resolve(dirname, 'src/app'),
      '@components': path.resolve(dirname, 'src/components'),
      '@config': path.resolve(dirname, 'src/config'),
      '@data': path.resolve(dirname, 'src/data'),
      '@hooks': path.resolve(dirname, 'src/hooks'),
      '@hocs': path.resolve(dirname, 'src/hocs'),
      '@lib': path.resolve(dirname, 'src/lib'),
      '@services': path.resolve(dirname, 'src/services'),
      '@store': path.resolve(dirname, 'src/store'),
      '@tokens': path.resolve(dirname, 'src/tokens'),
      '@types': path.resolve(dirname, 'src/types'),
      '@typez': path.resolve(dirname, 'src/types'),
      '@workers': path.resolve(dirname, 'src/workers')
    }
  },

  test: {
    name: 'unit',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['src/**/*.stories.tsx']
  },

  plugins: []
});
