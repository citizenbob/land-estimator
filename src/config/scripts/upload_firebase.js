#!/usr/bin/env node

/**
 * Firebase Storage Upload Script
 * Uploads files to Firebase Storage for backup CDN
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
config({ path: path.join(__dirname, '..', '..', '..', '.env.local') });

// Initialize Firebase Admin
try {
  // Try to get service account from environment
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: '',
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url:
          'https://www.googleapis.com/oauth2/v1/certs'
      };

  if (
    serviceAccount &&
    serviceAccount.private_key &&
    serviceAccount.client_email
  ) {
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
  } else {
    // Fallback to default initialization (requires gcloud auth)
    initializeApp({
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        'land-estimator-29ee9.firebasestorage.app'
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

    const stats = fs.statSync(localPath);
    const fileSizeMB = stats.size / (1024 * 1024);

    console.log(
      `📤 Uploading ${localPath} (${fileSizeMB.toFixed(1)}MB) to ${remotePath}`
    );

    // For large files, use streaming upload
    const file = bucket.file(remotePath);

    if (fileSizeMB > 10) {
      // Use resumable upload for large files with progress tracking
      const stream = file.createWriteStream({
        resumable: true,
        timeout: 600000,
        metadata: {
          contentType: 'application/json'
        }
      });

      return new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(localPath);
        let uploadedBytes = 0;
        const totalBytes = stats.size;

        // Add timeout to prevent hanging
        const uploadTimeout = setTimeout(() => {
          reject(new Error('Upload timeout after 10 minutes'));
        }, 600000);

        fileStream.on('data', (chunk) => {
          uploadedBytes += chunk.length;
          const progress = ((uploadedBytes / totalBytes) * 100).toFixed(1);
          if (uploadedBytes % (1024 * 1024 * 5) === 0) {
            console.log(
              `📊 Upload progress: ${progress}% (${(uploadedBytes / 1024 / 1024).toFixed(1)}MB/${fileSizeMB.toFixed(1)}MB)`
            );
          }
        });

        stream.on('error', (error) => {
          clearTimeout(uploadTimeout);
          reject(error);
        });

        stream.on('finish', () => {
          clearTimeout(uploadTimeout);
          console.log(`✅ Uploaded ${localPath} to ${remotePath}`);
          resolve({ success: true, path: remotePath });
        });

        fileStream.pipe(stream);
      });
    } else {
      // Use simple upload for small files
      await file.save(fs.readFileSync(localPath));
      console.log(`✅ Uploaded ${localPath} to ${remotePath}`);
      return { success: true, path: remotePath };
    }
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
