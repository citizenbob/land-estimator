#!/usr/bin/env node
/*
Vercel Blob uploader using the official SDK with proper directory structure support
*/

import { put, list } from '@vercel/blob';
import { readFileSync } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '..', '..', '.env.local') });

async function uploadFile(
  localPath,
  remotePath,
  contentType = 'application/json'
) {
  console.log(`📤 Uploading ${localPath} → ${remotePath}`);

  try {
    // Read file content
    const fileContent = readFileSync(localPath);

    // Upload using official SDK
    const result = await put(remotePath, fileContent, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: contentType,
      allowOverwrite: true
    });

    console.log(`✅ Upload successful: ${result.url}`);
    console.log(`📊 Size: ${fileContent.length} bytes`);

    return result;
  } catch (error) {
    console.error(`❌ Upload failed: ${error.message}`);
    return null;
  }
}

async function listBlobs(prefix = '') {
  try {
    const result = await list({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      prefix: prefix
    });

    return result;
  } catch (error) {
    console.error(`❌ List failed: ${error.message}`);
    return null;
  }
}

// Export for use in the ingest pipeline
export { uploadFile, listBlobs };

// CLI usage
if (process.argv.length >= 3) {
  const command = process.argv[2];

  if (command === '--list') {
    const prefix = process.argv[3] || '';
    listBlobs(prefix)
      .then((result) => {
        if (result) {
          console.log(JSON.stringify(result, null, 2));
          process.exit(0);
        } else {
          console.log('Failed to list blobs');
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  } else if (process.argv.length >= 4) {
    // Upload command
    const localPath = process.argv[2];
    const remotePath = process.argv[3];
    const contentType = process.argv[4] || 'application/json';

    uploadFile(localPath, remotePath, contentType)
      .then((result) => {
        if (result) {
          console.log('Success!');
          process.exit(0);
        } else {
          console.log('Failed!');
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  } else {
    console.log(
      'Usage: node upload_blob.js [--list [prefix]] | [localPath remotePath [contentType]]'
    );
    process.exit(1);
  }
}
