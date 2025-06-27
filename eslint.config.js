import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import storybookPlugin from 'eslint-plugin-storybook';
import tsParser from '@typescript-eslint/parser';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});

const config = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/src/data/**',
      '**/cypress/screenshots/**',
      '**/cypress/videos/**',
      '**/storybook-static/**',
      '**/public/data/**',
      '**/public/address-index.json',
      '**/public/address-index.json.gz',
      '**/public/address-index.backup.json',
      '**/*.json',
      '**/*.csv',
      '**/*.geojson',
      '**/*.py',
      '**/__pycache__/**',
      '**/venv/**',
      '**/.venv/**',
      '**/env/**',
      '**/.env/**',
      '**/logs/**',
      '**/saint_louis_city/**',
      '**/saint_louis_county/**',
      '**/data/**',
      'validate_zip_codes.js'
    ]
  },
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
