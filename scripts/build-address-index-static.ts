#!/usr/bin/env tsx
/**
 * Build Script for Static Address Index
 *
 * This script builds static FlexSearch address index files for delivery via /public/search.
 * Integrates with the existing data pipeline but outputs to static files instead of CDN.
 *
 * Usage:
 *   npm run build:address-index
 *   OR
 *   npx tsx scripts/build-address-index-static.ts
 */

import FlexSearch from 'flexsearch';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FLEXSEARCH_CONFIG = {
  tokenize: 'forward',
  cache: 100,
  resolution: 3
} as const;

const PUBLIC_SEARCH_DIR = path.join(__dirname, '..', 'public', 'search');

interface AddressRecord {
  display_name: string;
  parcel_id: string;
  region: string;
  latitude: number;
  longitude: number;
}

/**
 * Generate version hash for cache busting
 */
function generateVersionHash(data: AddressRecord[]): string {
  const content = JSON.stringify(data);
  const hash = crypto.createHash('md5').update(content).digest('hex');
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `v${date}-${hash.substring(0, 8)}`;
}

/**
 * Clean up old static files
 */
function cleanupOldFiles(currentVersion: string): void {
  if (!fs.existsSync(PUBLIC_SEARCH_DIR)) {
    return;
  }

  const files = fs.readdirSync(PUBLIC_SEARCH_DIR);
  const filesToDelete = files.filter(
    (file) =>
      file.startsWith('address-') &&
      !file.includes(currentVersion) &&
      file !== 'latest.json'
  );

  filesToDelete.forEach((file) => {
    const filePath = path.join(PUBLIC_SEARCH_DIR, file);
    fs.unlinkSync(filePath);
    console.log(`🗑️  Cleaned up ${file}`);
  });
}

/**
 * Load address data from static files or external sources
 *
 * NEW APPROACH:
 * 1. Try existing static address data in /public/search (committed to git)
 * 2. Try downloading from Vercel Blob Storage (if available)
 * 3. Try downloading from Firestore (if available)
 * 4. Fallback to synthetic test data (development only)
 *
 * The goal is to have static address data committed to the repo so we don't
 * depend on external services for core search functionality.
 */
async function loadAddressData(): Promise<AddressRecord[]> {
  console.log('📥 Loading address data from available sources...');

  const realDataPath = path.join(__dirname, 'source-address-data.json');

  if (fs.existsSync(realDataPath)) {
    console.log('🎯 Found real address data from Firebase download!');

    try {
      const realData = JSON.parse(fs.readFileSync(realDataPath, 'utf8'));

      if (
        realData.parcelIds &&
        realData.searchStrings &&
        realData.parcelIds.length > 0
      ) {
        console.log(
          `📊 Loading ${realData.parcelIds.length} REAL addresses from Firebase`
        );

        const addresses: AddressRecord[] = realData.parcelIds.map(
          (parcelId: string, idx: number) => {
            const searchString = realData.searchStrings[idx];
            const address =
              searchString?.replace(` ${parcelId}`, '') || 'Unknown Address';

            return {
              display_name: address,
              parcel_id: parcelId,
              region: 'California',
              latitude: 0,
              longitude: 0
            };
          }
        );

        console.log(
          `✅ Loaded ${addresses.length} REAL addresses from Firebase Storage`
        );
        console.log(`📍 Sample: ${addresses[0]?.display_name}`);
        return addresses;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to parse real data file: ${error}`);
    }
  } else {
    console.log(
      '⚠️ No real data found. Run: npx tsx scripts/download-real-address-index.ts'
    );
  }

  const latestPath = path.join(PUBLIC_SEARCH_DIR, 'latest.json');

  if (fs.existsSync(latestPath)) {
    console.log('🔍 Found latest.json, checking for existing address data...');

    try {
      const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
      const lookupFile = latest.files?.find((f: string) =>
        f.includes('lookup')
      );

      if (lookupFile) {
        const lookupPath = path.join(PUBLIC_SEARCH_DIR, lookupFile);

        if (fs.existsSync(lookupPath)) {
          console.log(`🔍 Found existing lookup file: ${lookupFile}`);

          const lookupData = JSON.parse(fs.readFileSync(lookupPath, 'utf8'));

          if (lookupData.parcelIds && lookupData.addressData) {
            const sampleAddress = Object.values(
              lookupData.addressData
            )[0] as string;
            const isTestData =
              sampleAddress.includes('PARCEL_') ||
              sampleAddress.includes('Test') ||
              sampleAddress.includes('Demo');

            if (isTestData) {
              console.log(
                '⚠️ Existing data appears to be synthetic test data, will try to load real data...'
              );
            } else {
              const addresses: AddressRecord[] = lookupData.parcelIds.map(
                (parcelId: string) => ({
                  display_name:
                    lookupData.addressData[parcelId] || 'Unknown Address',
                  parcel_id: parcelId,
                  region: 'Unknown Region',
                  latitude: 0,
                  longitude: 0
                })
              );

              console.log(
                `✅ Loaded ${addresses.length} REAL addresses from existing lookup`
              );
              return addresses;
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to parse latest.json or lookup file: ${error}`);
    }
  }

  console.log('🌐 Attempting to download from Vercel Blob Storage...');

  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const blobScriptPath = path.join(
      __dirname,
      '..',
      'src',
      'config',
      'scripts',
      'upload_blob.js'
    );

    if (fs.existsSync(blobScriptPath)) {
      console.log('📋 Checking for latest address index in blob storage...');

      const { stdout } = await execAsync(
        `node "${blobScriptPath}" --list cdn/`
      );
      const blobList = JSON.parse(stdout);

      if (blobList && blobList.blobs) {
        const addressIndexBlobs = blobList.blobs.filter(
          (blob: { pathname: string }) =>
            blob.pathname.includes('address-index') &&
            blob.pathname.endsWith('.json.gz')
        );

        if (addressIndexBlobs.length > 0) {
          addressIndexBlobs.sort(
            (a: { uploadedAt: string }, b: { uploadedAt: string }) =>
              new Date(b.uploadedAt).getTime() -
              new Date(a.uploadedAt).getTime()
          );

          const latestBlob = addressIndexBlobs[0];
          console.log(`📥 Found latest address index: ${latestBlob.pathname}`);

          const tempPath = path.join(__dirname, 'temp_address_index.json.gz');

          const pythonScriptPath = path.join(
            __dirname,
            '..',
            'src',
            'config',
            'scripts',
            'upload_blob.py'
          );

          if (fs.existsSync(pythonScriptPath)) {
            const downloadCmd = `cd "${path.dirname(pythonScriptPath)}" && python3 -c "
from upload_blob import BlobClient
import json
import gzip

client = BlobClient()
success = client.download_file('${latestBlob.pathname}', '${tempPath}')

if success:
    with gzip.open('${tempPath}', 'rt', encoding='utf-8') as f:
        data = json.load(f)
        print(json.dumps({'success': True, 'recordCount': len(data.get('parcelIds', []))}))
else:
    print(json.dumps({'success': False}))
"`;

            const downloadResult = await execAsync(downloadCmd);
            const result = JSON.parse(downloadResult.stdout);

            if (result.success && fs.existsSync(tempPath)) {
              console.log(
                `✅ Downloaded address index with ${result.recordCount} records`
              );

              const { createGunzip } = await import('zlib');
              const gunzip = createGunzip();
              const readStream = fs.createReadStream(tempPath);

              return new Promise<AddressRecord[]>((resolve, reject) => {
                let data = '';
                readStream
                  .pipe(gunzip)
                  .on('data', (chunk) => {
                    data += chunk;
                  })
                  .on('end', () => {
                    try {
                      const indexData = JSON.parse(data);

                      const addresses: AddressRecord[] =
                        indexData.parcelIds.map(
                          (parcelId: string, idx: number) => {
                            const searchString = indexData.searchStrings[idx];
                            const address = searchString.replace(
                              ` ${parcelId}`,
                              ''
                            );

                            return {
                              display_name: address,
                              parcel_id: parcelId,
                              region: 'Unknown Region',
                              latitude: 0,
                              longitude: 0
                            };
                          }
                        );

                      fs.unlinkSync(tempPath);
                      console.log(
                        `✅ Loaded ${addresses.length} addresses from blob storage`
                      );
                      resolve(addresses);
                    } catch (error) {
                      reject(error);
                    }
                  })
                  .on('error', reject);
              });
            }
          }
        } else {
          console.log('⚠️ No address index files found in blob storage');
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ Blob storage download failed: ${error}`);
  }

  console.log('🔥 Attempting to download from Firestore...');

  try {
    const firebaseConfigPath = path.join(
      __dirname,
      '..',
      'serviceAccountKey.json'
    );

    if (fs.existsSync(firebaseConfigPath)) {
      console.log('🔑 Found Firebase service account key, initializing...');

      const { initializeApp, cert } = await import('firebase-admin/app');
      const { getFirestore } = await import('firebase-admin/firestore');

      const serviceAccount = JSON.parse(
        fs.readFileSync(firebaseConfigPath, 'utf8')
      );

      const app = initializeApp({
        credential: cert(serviceAccount)
      });

      const db = getFirestore(app);

      const addressIndexDoc = await db
        .collection('address-indexes')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (!addressIndexDoc.empty) {
        const docData = addressIndexDoc.docs[0].data();
        console.log(
          `🔥 Found Firestore address index with ${docData.recordCount} records`
        );

        if (docData.parcelIds && docData.searchStrings) {
          const addresses: AddressRecord[] = docData.parcelIds.map(
            (parcelId: string, idx: number) => {
              const searchString = docData.searchStrings[idx];
              const address = searchString.replace(` ${parcelId}`, '');

              return {
                display_name: address,
                parcel_id: parcelId,
                region: docData.region || 'Unknown Region',
                latitude: 0,
                longitude: 0
              };
            }
          );

          console.log(`✅ Loaded ${addresses.length} addresses from Firestore`);
          return addresses;
        }
      } else {
        console.log('⚠️ No address indexes found in Firestore');
      }
    } else {
      console.log(
        '⚠️ Firebase service account key not found, skipping Firestore'
      );
    }
  } catch (error) {
    console.warn(`⚠️ Firestore download failed: ${error}`);
  }

  console.log('🧪 Using synthetic test data as fallback...');
  console.log(
    '⚠️ USING FALLBACK TEST DATA - This means real data loading failed!'
  );
  console.log(
    '⚠️ In production, this should download from Vercel Blob Storage or Firestore'
  );

  console.log('📊 Generating realistic synthetic addresses for California...');
  return generateTestAddressData();
}

/**
 * Generate synthetic address data for testing
 */
function generateTestAddressData(): AddressRecord[] {
  const cities = [
    'Sacramento',
    'San Francisco',
    'Los Angeles',
    'San Diego',
    'Davis',
    'Roseville',
    'Folsom',
    'Elk Grove',
    'Oakland',
    'San Jose'
  ];
  const streets = [
    'Main St',
    'Oak Ave',
    'Pine Rd',
    'First St',
    'Broadway',
    'Market St',
    'Church St',
    'Park Ave',
    'Elm St',
    'Cedar Dr'
  ];
  const regions = [
    'Sacramento County',
    'San Francisco County',
    'Los Angeles County',
    'San Diego County',
    'Yolo County',
    'Placer County',
    'Alameda County',
    'Santa Clara County'
  ];

  const DATASET_SIZE = 5000;

  console.log(
    `📊 Generating ${DATASET_SIZE} synthetic addresses (NOT real data)`
  );

  return Array.from({ length: DATASET_SIZE }, (_, i) => {
    const number = 100 + ((i * 7) % 9999);
    const street = streets[i % streets.length];
    const city = cities[i % cities.length];
    const region = regions[i % regions.length];
    const zip = 90000 + (i % 10000);
    const parcelId = `CA_TEST_${String(i).padStart(6, '0')}`;

    return {
      display_name: `${number} ${street}, ${city}, CA ${zip}`,
      parcel_id: parcelId,
      region,
      latitude: 34.0 + (Math.random() - 0.5) * 8,
      longitude: -119.0 + (Math.random() - 0.5) * 6
    };
  });
}

/**
 * Build static address index files
 */
async function buildStaticAddressIndex(): Promise<void> {
  console.log('🏗️  Building Static Address Index');
  console.log('=================================');

  const buildStart = performance.now();

  if (!fs.existsSync(PUBLIC_SEARCH_DIR)) {
    fs.mkdirSync(PUBLIC_SEARCH_DIR, { recursive: true });
  }

  console.log('📥 Loading address data from ingest pipeline...');
  const addresses = await loadAddressData();
  console.log(`📊 Processing ${addresses.length} addresses`);

  const version = generateVersionHash(addresses);
  console.log(`📦 Version: ${version}`);

  cleanupOldFiles(version);

  console.log('⚡ Building FlexSearch index...');
  const indexBuildStart = performance.now();

  const searchIndex = new FlexSearch.Index(FLEXSEARCH_CONFIG);
  const searchStrings: string[] = [];
  const parcelIds: string[] = [];

  addresses.forEach((address, idx) => {
    const searchString = `${address.display_name} ${address.parcel_id}`;
    searchStrings.push(searchString);
    parcelIds.push(address.parcel_id);

    searchIndex.add(idx, searchString);
  });

  const indexBuildTime = performance.now() - indexBuildStart;
  console.log(`🔍 Index built in ${indexBuildTime.toFixed(2)}ms`);

  console.log('📤 Exporting FlexSearch index...');
  const exportStart = performance.now();
  const exportedFiles: string[] = [];

  try {
    searchIndex.export((key: string, data: unknown) => {
      const filename = `address-${version}-${key}.json`;
      const filePath = path.join(PUBLIC_SEARCH_DIR, filename);
      const content =
        data !== undefined && data !== null ? JSON.stringify(data) : '{}';

      fs.writeFileSync(filePath, content, 'utf8');
      exportedFiles.push(filename);

      console.log(`  ✅ ${filename} (${content.length} bytes)`);
      return data;
    });

    console.log('✅ FlexSearch export completed');
  } catch (error) {
    console.log(`⚠️ FlexSearch export failed: ${error}`);
    console.log('📝 Note: Will rely on fast rebuild fallback');
  }

  const exportTime = performance.now() - exportStart;

  console.log('📋 Creating lookup data...');
  const lookupData = {
    parcelIds,
    searchStrings,
    addressData: addresses.reduce(
      (acc, address) => {
        acc[address.parcel_id] = address.display_name;
        return acc;
      },
      {} as Record<string, string>
    )
  };

  const lookupFilename = `address-${version}-lookup.json`;
  fs.writeFileSync(
    path.join(PUBLIC_SEARCH_DIR, lookupFilename),
    JSON.stringify(lookupData),
    'utf8'
  );
  exportedFiles.push(lookupFilename);

  const metadataFilename = `address-${version}-metadata.json`;
  const metadata = {
    version,
    timestamp: new Date().toISOString(),
    recordCount: addresses.length,
    config: FLEXSEARCH_CONFIG,
    exportedFiles,
    indexBuildTime: Math.round(indexBuildTime),
    exportTime: Math.round(exportTime)
  };

  fs.writeFileSync(
    path.join(PUBLIC_SEARCH_DIR, metadataFilename),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );
  exportedFiles.push(metadataFilename);

  const latestManifest = {
    version,
    timestamp: new Date().toISOString(),
    recordCount: addresses.length,
    config: FLEXSEARCH_CONFIG,
    files: exportedFiles
  };

  fs.writeFileSync(
    path.join(PUBLIC_SEARCH_DIR, 'latest.json'),
    JSON.stringify(latestManifest, null, 2),
    'utf8'
  );

  const totalTime = performance.now() - buildStart;

  console.log('\n✅ Static address index build completed!');
  console.log(`📊 Files created: ${exportedFiles.length + 1}`);
  console.log(`📊 Total addresses: ${addresses.length}`);
  console.log(`📊 Build time: ${totalTime.toFixed(2)}ms`);
  console.log(`📁 Output directory: ${PUBLIC_SEARCH_DIR}`);

  console.log('\n🌐 Static files available at:');
  console.log('   /search/latest.json');
  exportedFiles.forEach((file) => {
    console.log(`   /search/${file}`);
  });

  console.log('\n🧪 Testing static index...');
  const testResults = searchIndex.search('Sacramento', { limit: 3 });
  console.log(`🔍 Test search for "Sacramento": ${testResults.length} results`);

  if (testResults.length > 0) {
    testResults.forEach((idx, i) => {
      const parcelId = parcelIds[idx as number];
      const address = lookupData.addressData[parcelId];
      console.log(`   ${i + 1}. ${address}`);
    });
  }

  console.log('\n🎯 Next steps:');
  console.log('1. Commit these files to git for static deployment');
  console.log('2. Update loadAddressIndex.ts to use static loader');
  console.log('3. Test locally with yarn dev');
  console.log(
    '4. Deploy to Vercel - files will be served from CDN automatically'
  );
  console.log('\n💡 STRATEGY:');
  console.log('• Address index: Static files in /public/search (this)');
  console.log('• Parcel geometry: External CDN (Vercel Blob/Firestore)');
  console.log(
    '• Benefits: Instant search, no download failures, simple deployment'
  );
}

/**
 * CLI execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  buildStaticAddressIndex()
    .then(() => {
      console.log('\n🎉 Build completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Build failed:', error);
      process.exit(1);
    });
}

export { buildStaticAddressIndex };
