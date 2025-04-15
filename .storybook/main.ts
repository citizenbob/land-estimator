import type { StorybookConfig } from '@storybook/experimental-nextjs-vite';
import { mergeConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-onboarding',
    '@chromatic-com/storybook',
    '@storybook/experimental-addon-test',
    '@storybook/addon-a11y'
  ],
  framework: {
    name: '@storybook/experimental-nextjs-vite',
    options: {}
  },
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@app': path.resolve(__dirname, '../src/app'),
          '@components': path.resolve(__dirname, '../src/components'),
          '@config': path.resolve(__dirname, '../src/config'),
          '@hocs': path.resolve(__dirname, '../src/hocs'),
          '@hooks': path.resolve(__dirname, '../src/hooks'),
          '@lib': path.resolve(__dirname, '../src/lib'),
          '@services': path.resolve(__dirname, '../src/services'),
          '@store': path.resolve(__dirname, '../src/store'),
          '@tokens': path.resolve(__dirname, '../src/tokens'),
          '@typez': path.resolve(__dirname, '../src/types')
        }
      }
    });
  }
};

export default config;
