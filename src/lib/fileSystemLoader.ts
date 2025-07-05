/**
 * @fileoverview Server-side file system loader for static address index files
 * This module is only imported on the server side to avoid webpack warnings
 */

import fs from 'fs';
import path from 'path';
import type { StaticAddressManifest, AddressLookupData } from '@app-types';

/**
 * Load static address index files from the filesystem (server-side only)
 *
 * Attempts to load the manifest and lookup data from the public/search directory.
 * This function should only be called on the server side to avoid webpack warnings.
 *
 * @returns Promise resolving to manifest and lookup data, or null if files are not found
 * @throws Never throws - all errors are caught and logged, returning null instead
 */
export async function loadStaticFilesFromFileSystem(): Promise<{
  manifest: StaticAddressManifest;
  lookupData: AddressLookupData;
} | null> {
  try {
    const publicSearchDir = path.join(process.cwd(), 'public', 'search');
    const manifestPath = path.join(publicSearchDir, 'latest.json');

    if (!fs.existsSync(manifestPath)) {
      console.log(
        '📭 Static manifest not found on filesystem, will try CDN fallback'
      );
      return null;
    }

    const manifestData = fs.readFileSync(manifestPath, 'utf8');
    const manifest: StaticAddressManifest = JSON.parse(manifestData);

    console.log(
      `📊 Found static address index v${manifest.version} with ${manifest.recordCount} records (filesystem)`
    );

    const lookupFile = manifest.files.find((f) => f.includes('lookup'));
    if (!lookupFile) {
      console.log(
        '📭 Static lookup file not found on filesystem, will try CDN fallback'
      );
      return null;
    }

    const lookupPath = path.join(publicSearchDir, lookupFile);
    if (!fs.existsSync(lookupPath)) {
      console.log(
        '📭 Static lookup file missing on filesystem, will try CDN fallback'
      );
      return null;
    }

    const lookupData: AddressLookupData = JSON.parse(
      fs.readFileSync(lookupPath, 'utf8')
    );

    console.log(
      `✅ Static lookup data loaded: ${lookupData.parcelIds.length} addresses (filesystem)`
    );

    return { manifest, lookupData };
  } catch (error) {
    console.log(`⚠️ Filesystem loading failed: ${error}`);
    return null;
  }
}
