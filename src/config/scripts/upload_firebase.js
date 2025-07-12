#!/usr/bin/env node

/**
 * Firebase Storage Upload Script
 * Uploads files to Firebase Storage for backup CDN
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';

// Initialize Firebase Admin
try {
  // Try to get service account from environment
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
  } else {
    // Fallback to default initialization (requires gcloud auth)
    initializeApp({
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        'land-estimator-default.appspot.com'
    });
  }

  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const bucket = getStorage().bucket();

async function uploadFile(localPath, remotePath) {
  try {
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local file not found: ${localPath}`);
    }

    const file = bucket.file(remotePath);
    await file.save(fs.readFileSync(localPath));

    console.log(`✅ Uploaded ${localPath} to ${remotePath}`);
    return { success: true, path: remotePath };
  } catch (error) {
    console.error(`❌ Upload failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function listFiles(prefix = '') {
  try {
    const [files] = await bucket.getFiles({ prefix });
    const fileNames = files.map((file) => file.name);

    console.log(`📁 Found ${fileNames.length} files with prefix "${prefix}"`);
    return { success: true, files: fileNames };
  } catch (error) {
    console.error(`❌ List failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testConnection() {
  try {
    await bucket.getFiles({ maxResults: 1 });
    console.log('✅ Firebase Storage connection successful');
    return { success: true };
  } catch (error) {
    console.error(`❌ Firebase connection test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node upload_firebase.js test');
    console.log('  node upload_firebase.js upload <local_path> <remote_path>');
    console.log('  node upload_firebase.js list [prefix]');
    process.exit(1);
  }

  const command = args[0];

  try {
    switch (command) {
      case 'test': {
        const testResult = await testConnection();
        console.log(JSON.stringify(testResult));
        break;
      }

      case 'upload': {
        if (args.length < 3) {
          console.error('❌ Upload requires local_path and remote_path');
          process.exit(1);
        }
        const uploadResult = await uploadFile(args[1], args[2]);
        console.log(JSON.stringify(uploadResult));
        break;
      }

      case 'list': {
        const prefix = args[1] || '';
        const listResult = await listFiles(prefix);
        console.log(JSON.stringify(listResult));
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Command failed: ${error.message}`);
    process.exit(1);
  }
}

main();
