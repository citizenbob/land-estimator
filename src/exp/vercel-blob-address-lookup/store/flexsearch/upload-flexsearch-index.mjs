#!/usr/bin/env node

import { createReadStream, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { put } from '@vercel/blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Robustly find the project root by looking for package.json
function findProjectRoot() {
  let current = __dirname;

  while (current !== dirname(current)) {
    if (existsSync(join(current, 'package.json'))) {
      return current;
    }
    current = dirname(current);
  }

  throw new Error('Could not find project root (package.json not found)');
}

const projectRoot = findProjectRoot();
const envPath = join(projectRoot, '.env.local');

if (!existsSync(envPath)) {
  throw new Error(`Could not find .env.local at ${envPath}`);
}

// Load environment variables from .env.local
config({ path: envPath });

console.log('📂 Project root:', projectRoot);
console.log('🔧 Loading .env.local from:', envPath);

console.log('🔍 Checking environment variables...');
console.log(
  'Vercel Blob Token:',
  process.env.BLOB_READ_WRITE_TOKEN ? '✅ Found' : '❌ Missing'
);

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
}

async function uploadFlexSearchIndex() {
  try {
    console.log('🚀 Uploading FlexSearch index to Vercel Blob...');

    const localFilePath = join(__dirname, 'flexsearch-index.json.gz');
    const destinationPath = 'flexsearch-index.json.gz';

    console.log(`📁 Local file: ${localFilePath}`);
    console.log(`☁️  Destination: Vercel Blob - ${destinationPath}`);

    // Read the file
    const fileBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      const stream = createReadStream(localFilePath);

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });

    // Upload to Vercel Blob
    const blob = await put(destinationPath, fileBuffer, {
      access: 'public',
      contentType: 'application/gzip',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true
    });

    console.log('✅ FlexSearch index uploaded successfully to Vercel Blob!');
    console.log(`🌐 Public URL: ${blob.url}`);
    console.log(`📊 Size: ${fileBuffer.length} bytes`);

    // Output the URL for easy copying to worker
    console.log('\n📋 Copy this URL to your flexsearch-worker.ts:');
    console.log(`const FLEXSEARCH_INDEX_URL = '${blob.url}';`);
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

uploadFlexSearchIndex();
