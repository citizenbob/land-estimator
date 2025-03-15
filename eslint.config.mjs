import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      indent: ['error', 2],
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'comma-dangle': ['error', 'always-multiline'],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'no-inline-comments': 'error',
      'no-warning-comments': 'error',
    },
    settings: {
      // You can add additional settings here if needed
    },
  },
];

export default eslintConfig;
