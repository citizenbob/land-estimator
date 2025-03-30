import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import storybookPlugin from 'eslint-plugin-storybook';
import tsParser from '@typescript-eslint/parser';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});

const config = [
  { ignores: ['!.storybook'] },
  js.configs.recommended,
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript']
  }),
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    }
  },
  ...storybookPlugin.configs['flat/recommended'],
  {
    rules: {
      indent: 'off',
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'comma-dangle': ['error', 'never'],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'no-inline-comments': 'error',
      'no-warning-comments': 'error'
    }
  }
];

export default config;
