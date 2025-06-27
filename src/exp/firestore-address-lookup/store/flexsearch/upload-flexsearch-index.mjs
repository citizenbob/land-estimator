#!/usr/bin/env node

import { createReadStream, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

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
  'Project ID:',
  process.env.FIREBASE_PROJECT_ID ? '✅ Found' : '❌ Missing'
);
console.log(
  'Client Email:',
  process.env.FIREBASE_CLIENT_EMAIL ? '✅ Found' : '❌ Missing'
);
console.log(
  'Private Key:',
  process.env.FIREBASE_PRIVATE_KEY ? '✅ Found' : '❌ Missing'
);
console.log(
  'Storage Bucket:',
  process.env.FIREBASE_STORAGE_BUCKET ? '✅ Found' : '❌ Missing'
);

// Initialize Firebase Admin
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

console.log('🔥 Firebase initialized successfully!');

async function uploadFlexSearchIndex() {
  try {
    console.log('🚀 Uploading FlexSearch index to Firebase Storage...');

    const bucket = getStorage().bucket();
    const localFilePath = join(__dirname, 'flexsearch-index.json.gz');
    const destinationPath = 'cdn/flexsearch-index.json.gz';

    console.log(`📁 Local file: ${localFilePath}`);
    console.log(`☁️  Destination: gs://${bucket.name}/${destinationPath}`);

    const file = bucket.file(destinationPath);

    // Upload the file
    await new Promise((resolve, reject) => {
      const stream = createReadStream(localFilePath);
      const uploadStream = file.createWriteStream({
        metadata: {
          contentType: 'application/gzip',
          cacheControl: 'public, max-age=3600'
        }
      });

      stream.pipe(uploadStream).on('error', reject).on('finish', resolve);
    });

    // Make the file publicly readable
    await file.makePublic();

    console.log('✅ FlexSearch index uploaded successfully!');
    console.log(
      `🌐 Public URL: https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/cdn%2Fflexsearch-index.json.gz?alt=media`
    );
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

uploadFlexSearchIndex();
