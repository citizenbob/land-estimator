#!/usr/bin/env node

/**
 * Emergency Backup Creator
 *
 * Creates minimal backup files for when CDN is unavailable.
 * These should be much smaller than full datasets and stored locally.
 *
 * Usage: node src/config/scripts/create_emergency_backups.js
 */

import fs from 'fs';
import path from 'path';

async function createEmergencyBackups() {
  console.log('🚨 Creating emergency backup files...');

  try {
    // Check if we have temp files from latest build
    const tempDir = path.join(process.cwd(), 'temp');
    const publicDir = path.join(process.cwd(), 'public');

    const addressIndexPath = path.join(tempDir, 'address-index.json.gz');
    const parcelMetadataPath = path.join(tempDir, 'parcel-metadata.json.gz');

    const addressBackupPath = path.join(
      publicDir,
      'address-index-backup.json.gz'
    );
    const parcelBackupPath = path.join(
      publicDir,
      'parcel-metadata-backup.json.gz'
    );

    // Copy address index backup if available
    if (fs.existsSync(addressIndexPath)) {
      fs.copyFileSync(addressIndexPath, addressBackupPath);
      const stats = fs.statSync(addressBackupPath);
      console.log(
        `✅ Created address index backup: ${(stats.size / 1024 / 1024).toFixed(1)}MB`
      );
    } else {
      console.log('⚠️ No address index file found in temp directory');
    }

    // Copy parcel metadata backup if available
    if (fs.existsSync(parcelMetadataPath)) {
      fs.copyFileSync(parcelMetadataPath, parcelBackupPath);
      const stats = fs.statSync(parcelBackupPath);
      console.log(
        `✅ Created parcel metadata backup: ${(stats.size / 1024 / 1024).toFixed(1)}MB`
      );
    } else {
      console.log('⚠️ No parcel metadata file found in temp directory');
    }

    // Update .gitignore to include these backups
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

    const backupEntries = [
      '/public/address-index-backup.json.gz',
      '/public/parcel-metadata-backup.json.gz'
    ];

    let updatedGitignore = gitignoreContent;
    let needsUpdate = false;

    backupEntries.forEach((entry) => {
      if (!gitignoreContent.includes(entry)) {
        updatedGitignore += `\n${entry}`;
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      fs.writeFileSync(gitignorePath, updatedGitignore);
      console.log('✅ Updated .gitignore to include backup files');
    }

    console.log(
      '\n📝 Note: Emergency backups provide basic functionality when CDN is unavailable'
    );
    console.log(
      '💡 Run this script after each successful data pipeline execution'
    );
  } catch (error) {
    console.error('❌ Failed to create emergency backups:', error);
    process.exit(1);
  }
}

createEmergencyBackups();
