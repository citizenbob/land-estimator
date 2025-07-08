#!/usr/bin/env tsx
/**
 * FlexSearch Index Builder for Ingest Pipeline
 *
 * This script builds FlexSearch indexes from integration data following
 * the patterns established in the experimental implementations.
 *
 * Input: /temp/raw/address_index.json (from integration bucket)
 * Output: /temp/address-index.json.gz (for CDN upload) OR /public/search/ (for static deployment)
 *
 * Usage:
 *   tsx src/config/scripts/flexsearch_builder.ts                    # Use existing temp data
 *   tsx src/config/scripts/flexsearch_builder.ts --nuke-and-pave   # Fetch fresh from Firebase Storage
 *   tsx src/config/scripts/flexsearch_builder.ts --static          # Output to /public/search/
 */

import FlexSearch from 'flexsearch';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

// ESM module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const NUKE_AND_PAVE = args.includes('--nuke-and-pave');
const STATIC_OUTPUT = args.includes('--static');

const TEMP_DIR = path.join(__dirname, 'temp');
const TEMP_RAW_DIR = path.join(TEMP_DIR, 'raw');
const PUBLIC_SEARCH_DIR = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'public',
  'search'
);

// For address index, use public/search if static mode is enabled
const ADDRESS_OUTPUT_DIR = STATIC_OUTPUT ? PUBLIC_SEARCH_DIR : TEMP_DIR;

// For parcel metadata and geometry, always use temp dir (never in public/search)
const PARCEL_OUTPUT_DIR = TEMP_DIR;

const FLEXSEARCH_CONFIG = {
  tokenize: 'forward',
  cache: 100,
  resolution: 3
} as const;

interface BuildStats {
  totalAddresses: number;
  totalParcels: number;
  indexesBuilt: string[];
  buildTime: string | null;
}

interface AddressData {
  addresses: Array<{
    display_name?: string;
    parcel_id?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  }>;
  metadata?: Record<string, unknown>;
}

interface ParcelData {
  parcels: Array<{
    id?: string;
    primary_full_address?: string;
    latitude?: number;
    longitude?: number;
    region?: string;
    calc?: {
      landarea?: number;
      building_sqft?: number;
      estimated_landscapable_area?: number;
      property_type?: string;
    };
    owner?: {
      name?: string;
    };
    affluence_score?: number;
  }>;
  metadata?: Record<string, unknown>;
}

interface GeometryData {
  [parcelId: string]: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
    bbox: [number, number, number, number];
  };
}

interface PrecomputedIndexData {
  parcelIds: string[];
  searchStrings: string[];
  timestamp: string;
  recordCount: number;
  version: string;
  exportMethod: string;
}

class FlexSearchBuilder {
  private stats: BuildStats;

  constructor() {
    this.stats = {
      totalAddresses: 0,
      totalParcels: 0,
      indexesBuilt: [],
      buildTime: null
    };

    console.log('🔍 FlexSearch Index Builder initialized');
    console.log(`📂 Temp directory: ${TEMP_DIR}`);
    console.log(`📥 Input directory: ${TEMP_RAW_DIR}`);
    console.log(`� Address output directory: ${ADDRESS_OUTPUT_DIR}`);
    console.log(`📂 Parcel output directory: ${PARCEL_OUTPUT_DIR}`);

    if (NUKE_AND_PAVE) {
      console.log(
        '💣 NUKE AND PAVE mode enabled - will fetch fresh data from Firebase Storage'
      );
    }
    if (STATIC_OUTPUT) {
      console.log(
        '📁 Static output mode - will create files for /public/search/'
      );
    }
  }

  /**
   * Fetch fresh address data from Firebase Storage
   */
  async fetchFromFirebaseStorage(): Promise<boolean> {
    console.log('🔥 Fetching fresh address data from Firebase Storage...');

    try {
      // Load environment variables
      const dotenv = await import('dotenv');
      const envPath = path.join(__dirname, '..', '..', '..', '.env.local');

      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
      }

      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

      if (!projectId || !clientEmail || !privateKey || !storageBucket) {
        throw new Error('Missing Firebase environment variables in .env.local');
      }

      console.log(`🔑 Connecting to Firebase Storage: ${storageBucket}`);

      const { initializeApp, cert } = await import('firebase-admin/app');
      const { getStorage } = await import('firebase-admin/storage');

      const serviceAccount = {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      };

      const app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket
      });

      const bucket = getStorage(app).bucket();

      // List files in the cdn/ directory to find the latest address index
      console.log('📂 Scanning Firebase Storage for address index files...');
      const [files] = await bucket.getFiles({ prefix: 'cdn/' });

      const addressIndexFiles = files.filter(
        (file) =>
          file.name.includes('address-index') && file.name.endsWith('.json.gz')
      );

      if (addressIndexFiles.length === 0) {
        console.log(
          '⚠️ No address index files found in Firebase Storage cdn/ folder'
        );
        return false;
      }

      // Sort by metadata creation time to get the latest
      const filesWithMetadata = await Promise.all(
        addressIndexFiles.map(async (file) => {
          const [metadata] = await file.getMetadata();
          return { file, metadata };
        })
      );

      filesWithMetadata.sort(
        (a, b) =>
          new Date(b.metadata.timeCreated || 0).getTime() -
          new Date(a.metadata.timeCreated || 0).getTime()
      );

      const latestFile = filesWithMetadata[0].file;
      console.log(`📥 Found latest address index: ${latestFile.name}`);
      console.log(`📅 Created: ${filesWithMetadata[0].metadata.timeCreated}`);

      // Download and decompress the file
      const tempPath = path.join(TEMP_RAW_DIR, 'address_index.json.gz');
      const outputPath = path.join(TEMP_RAW_DIR, 'address_index.json');

      // Ensure temp directory exists
      if (!fs.existsSync(TEMP_RAW_DIR)) {
        fs.mkdirSync(TEMP_RAW_DIR, { recursive: true });
      }

      console.log('⬇️  Downloading compressed address index...');
      await latestFile.download({ destination: tempPath });

      console.log('📦 Decompressing address index...');
      const compressedData = fs.readFileSync(tempPath);
      const decompressedData = zlib.gunzipSync(compressedData);
      fs.writeFileSync(outputPath, decompressedData);

      // Clean up compressed file
      fs.unlinkSync(tempPath);

      // Verify the data structure and convert to expected format
      const indexData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      if (indexData.parcelIds && indexData.searchStrings) {
        console.log(
          `📊 Downloaded ${indexData.parcelIds.length} addresses from Firebase Storage`
        );

        // Convert to the expected format for the rest of the script
        const convertedData = {
          addresses: indexData.parcelIds.map(
            (parcelId: string, idx: number) => {
              const searchString = indexData.searchStrings[idx];
              const address = searchString.replace(` ${parcelId}`, '');

              return {
                display_name: address,
                parcel_id: parcelId,
                region: 'Missouri',
                latitude: 0,
                longitude: 0
              };
            }
          ),
          metadata: {
            timestamp: indexData.timestamp,
            recordCount: indexData.recordCount,
            source: 'firebase_storage'
          }
        };

        // Overwrite the file with the converted format
        fs.writeFileSync(outputPath, JSON.stringify(convertedData), 'utf8');

        console.log(
          `✅ Successfully converted ${convertedData.addresses.length} addresses to expected format`
        );
        return true;
      } else {
        throw new Error('Invalid address index data structure');
      }
    } catch (error) {
      console.error(`❌ Failed to fetch from Firebase Storage: ${error}`);
      return false;
    }
  }

  async buildAddressIndex(): Promise<boolean> {
    console.log('\n🏠 Building Address FlexSearch Index...');

    try {
      const addressIndexPath = path.join(TEMP_RAW_DIR, 'address_index.json');

      // If --nuke-and-pave is set, try to fetch fresh data from Firebase Storage
      if (NUKE_AND_PAVE) {
        console.log(
          '💣 NUKE AND PAVE: Removing existing data and fetching fresh from Firebase Storage...'
        );

        // Remove existing file if it exists
        if (fs.existsSync(addressIndexPath)) {
          fs.unlinkSync(addressIndexPath);
          console.log('🗑️ Removed existing address index file');
        }

        const fetchSuccess = await this.fetchFromFirebaseStorage();
        if (!fetchSuccess) {
          throw new Error(
            'Failed to fetch fresh data from Firebase Storage in NUKE AND PAVE mode'
          );
        }
      }

      if (!fs.existsSync(addressIndexPath)) {
        throw new Error(
          `Address index not found: ${addressIndexPath}. Run the full data pipeline first: npm run build:data`
        );
      }

      const addressData: AddressData = JSON.parse(
        fs.readFileSync(addressIndexPath, 'utf8')
      );
      const addresses = addressData.addresses || [];

      console.log(`📋 Processing ${addresses.length} addresses`);

      const flexIndex = new FlexSearch.Index(FLEXSEARCH_CONFIG);

      const searchStrings: string[] = [];
      const parcelIds: string[] = [];

      addresses.forEach((addr, i) => {
        const searchable =
          `${addr.display_name || ''} ${addr.parcel_id || ''}`.trim();

        searchStrings.push(searchable);
        parcelIds.push(addr.parcel_id || '');

        flexIndex.add(i, searchable);
      });

      console.log(
        '📦 Creating simple index data (no export/import complexity)'
      );

      const indexData: PrecomputedIndexData = {
        parcelIds: parcelIds,
        searchStrings: searchStrings,
        timestamp: new Date().toISOString(),
        recordCount: addresses.length,
        version: '1.0-fast-rebuild',
        exportMethod: 'simple_rebuild_approach'
      };

      const jsonString = JSON.stringify(indexData);
      const compressed = zlib.gzipSync(Buffer.from(jsonString));

      // Ensure output directory exists
      // Ensure both output directories exist
      if (!fs.existsSync(ADDRESS_OUTPUT_DIR)) {
        fs.mkdirSync(ADDRESS_OUTPUT_DIR, { recursive: true });
      }
      if (!fs.existsSync(PARCEL_OUTPUT_DIR)) {
        fs.mkdirSync(PARCEL_OUTPUT_DIR, { recursive: true });
      }

      if (STATIC_OUTPUT) {
        // For static deployment, create multiple files like the web expects
        console.log('📁 Creating static deployment files...');

        // Create a version hash for cache busting
        const hash = crypto.createHash('md5').update(jsonString).digest('hex');
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const version = `v${date}-${hash.substring(0, 8)}`;

        // Create lookup data file
        const lookupData = {
          parcelIds: indexData.parcelIds,
          searchStrings: indexData.searchStrings,
          addressData: indexData.parcelIds.reduce(
            (acc: Record<string, string>, parcelId: string, idx: number) => {
              const searchString = indexData.searchStrings[idx];
              const address = searchString.replace(` ${parcelId}`, '').trim();
              acc[parcelId] = address;
              return acc;
            },
            {}
          )
        };

        const lookupFilename = `address-${version}-lookup.json`;
        fs.writeFileSync(
          path.join(ADDRESS_OUTPUT_DIR, lookupFilename),
          JSON.stringify(lookupData),
          'utf8'
        );

        // Create metadata file
        const metadataFilename = `address-${version}-metadata.json`;
        const metadata = {
          version,
          timestamp: new Date().toISOString(),
          recordCount: addresses.length,
          config: FLEXSEARCH_CONFIG,
          exportedFiles: [lookupFilename, metadataFilename],
          source: 'flexsearch_builder'
        };

        fs.writeFileSync(
          path.join(ADDRESS_OUTPUT_DIR, metadataFilename),
          JSON.stringify(metadata, null, 2),
          'utf8'
        );

        // Create latest.json manifest
        const latestManifest = {
          version,
          timestamp: new Date().toISOString(),
          recordCount: addresses.length,
          config: FLEXSEARCH_CONFIG,
          files: [lookupFilename, metadataFilename],
          source: 'flexsearch_builder'
        };

        fs.writeFileSync(
          path.join(ADDRESS_OUTPUT_DIR, 'latest.json'),
          JSON.stringify(latestManifest, null, 2),
          'utf8'
        );

        console.log(
          `✅ Static address index files created in ${ADDRESS_OUTPUT_DIR}`
        );
        console.log(
          `📁 Files: ${lookupFilename}, ${metadataFilename}, latest.json`
        );

        this.stats.indexesBuilt.push(
          lookupFilename,
          metadataFilename,
          'latest.json'
        );
      } else {
        // For CDN deployment, create compressed file
        const compressedPath = path.join(
          ADDRESS_OUTPUT_DIR,
          'address-index.json.gz'
        );
        fs.writeFileSync(compressedPath, compressed);
        this.stats.indexesBuilt.push('address-index.json.gz');
      }

      console.log(`✅ Address index built: ${addresses.length} entries`);
      console.log(`📊 Uncompressed: ${Math.round(jsonString.length / 1024)}KB`);
      console.log(`📊 Compressed: ${Math.round(compressed.length / 1024)}KB`);
      console.log(
        `📊 Compression ratio: ${Math.round((1 - compressed.length / jsonString.length) * 100)}%`
      );

      this.stats.totalAddresses = addresses.length;
      this.stats.indexesBuilt.push('address-index.json.gz');

      await this.testIndex(flexIndex, searchStrings);

      return true;
    } catch (error) {
      console.error('❌ Address index build failed:', error);
      return false;
    }
  }

  async buildParcelMetadataIndex(): Promise<boolean> {
    console.log('\n🏢 Building Parcel Metadata Index...');

    try {
      const parcelIndexPath = path.join(
        TEMP_RAW_DIR,
        'parcel_metadata_index.json'
      );

      let parcelData: ParcelData = { parcels: [], metadata: {} };

      if (fs.existsSync(parcelIndexPath)) {
        parcelData = JSON.parse(fs.readFileSync(parcelIndexPath, 'utf8'));
        console.log(`📋 Processing ${parcelData.parcels?.length || 0} parcels`);
      } else {
        console.log(
          '⚠️  Parcel metadata index not found, creating empty index'
        );
      }

      const parcelLookup: Record<
        string,
        {
          id: string;
          full_address: string;
          latitude: number;
          longitude: number;
          region: string;
          calc: {
            landarea: number;
            building_sqft: number;
            estimated_landscapable_area: number;
            property_type: string;
          };
          owner: {
            name: string;
          };
          affluence_score: number;
          source_file: string;
          processed_date: string;
        }
      > = {};
      const parcels = parcelData.parcels || [];

      parcels.forEach((parcel) => {
        if (parcel.id) {
          parcelLookup[parcel.id] = {
            id: parcel.id,
            full_address: parcel.primary_full_address || '',
            latitude: parcel.latitude || 0,
            longitude: parcel.longitude || 0,
            region: parcel.region || 'Unknown',
            calc: {
              landarea: parcel.calc?.landarea || 0,
              building_sqft: parcel.calc?.building_sqft || 0,
              estimated_landscapable_area:
                parcel.calc?.estimated_landscapable_area || 0,
              property_type: parcel.calc?.property_type || 'unknown'
            },
            owner: {
              name: parcel.owner?.name || 'Unknown'
            },
            affluence_score: parcel.affluence_score || 0,
            source_file: 'ingest_pipeline',
            processed_date: new Date().toISOString()
          };
        }
      });

      const metadataIndex = {
        parcels: parcelLookup,
        metadata: {
          totalParcels: Object.keys(parcelLookup).length,
          buildTime: new Date().toISOString(),
          sourceUrl: 'integration/parcel_metadata_index.json',
          version: '1.0-claude-pipeline'
        }
      };

      const jsonString = JSON.stringify(metadataIndex);
      const compressed = zlib.gzipSync(Buffer.from(jsonString));
      const compressedPath = path.join(
        PARCEL_OUTPUT_DIR,
        'parcel-metadata.json.gz'
      );
      fs.writeFileSync(compressedPath, compressed);

      console.log(
        `✅ Parcel metadata index built: ${Object.keys(parcelLookup).length} parcels`
      );
      console.log(
        `📊 Compressed size: ${Math.round(compressed.length / 1024)}KB`
      );

      this.stats.totalParcels = Object.keys(parcelLookup).length;
      this.stats.indexesBuilt.push('parcel-metadata.json.gz');

      return true;
    } catch (error) {
      console.error('❌ Parcel metadata index build failed:', error);
      return false;
    }
  }

  async buildParcelGeometryIndex(): Promise<boolean> {
    console.log('\n🗺️  Building Parcel Geometry Index...');

    try {
      const geometryIndexPath = path.join(
        TEMP_RAW_DIR,
        'parcel_geometry_index.json'
      );

      let geometryData: GeometryData = {};

      if (fs.existsSync(geometryIndexPath)) {
        geometryData = JSON.parse(fs.readFileSync(geometryIndexPath, 'utf8'));
        console.log(
          `📋 Processing ${Object.keys(geometryData).length} geometries`
        );
      } else {
        console.log('⚠️  Geometry index not found, creating empty index');
      }

      const geometryIndex = {
        geometries: geometryData,
        metadata: {
          totalGeometries: Object.keys(geometryData).length,
          buildTime: new Date().toISOString(),
          sourceUrl: 'integration/parcel_geometry_index.json',
          version: '1.0-claude-pipeline'
        }
      };

      const jsonString = JSON.stringify(geometryIndex);
      const compressed = zlib.gzipSync(Buffer.from(jsonString));
      const compressedPath = path.join(
        PARCEL_OUTPUT_DIR,
        'parcel-geometry.json.gz'
      );
      fs.writeFileSync(compressedPath, compressed);

      console.log(
        `✅ Geometry index built: ${Object.keys(geometryData).length} geometries`
      );
      console.log(
        `📊 Compressed size: ${Math.round(compressed.length / 1024)}KB`
      );

      this.stats.indexesBuilt.push('parcel-geometry.json.gz');

      return true;
    } catch (error) {
      console.error('❌ Geometry index build failed:', error);
      return false;
    }
  }

  async testIndex(
    flexIndex: InstanceType<typeof FlexSearch.Index>,
    searchStrings: string[]
  ): Promise<void> {
    console.log('\n🧪 Testing FlexSearch index...');

    try {
      const testQueries = ['626', '1st St', 'Main', 'Louis'];

      for (const query of testQueries) {
        const results = flexIndex.search(query, { limit: 3 }) as number[];

        console.log(`   "${query}" → ${results.length} results`);
        if (results.length > 0 && searchStrings[results[0]]) {
          console.log(`      ${searchStrings[results[0]].substring(0, 50)}...`);
        }
      }

      console.log('✅ Index test completed');
    } catch (error) {
      console.warn('⚠️  Index test failed:', error);
    }
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 FLEXSEARCH BUILD SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total Addresses: ${this.stats.totalAddresses}`);
    console.log(`📊 Total Parcels: ${this.stats.totalParcels}`);
    console.log(`🔍 Indexes Built: ${this.stats.indexesBuilt.join(', ')}`);
    console.log(`⏱️  Build Time: ${this.stats.buildTime}`);

    console.log('\n📁 Output Files:');
    this.stats.indexesBuilt.forEach((file) => {
      // Check if it's an address file or parcel file and use appropriate directory
      const isAddressFile = file.startsWith('address-');
      const outputDir = isAddressFile ? ADDRESS_OUTPUT_DIR : PARCEL_OUTPUT_DIR;
      const filePath = path.join(outputDir, file);

      if (fs.existsSync(filePath)) {
        const size = fs.statSync(filePath).size;
        console.log(`   ${file} (${Math.round(size / 1024)}KB)`);
      }
    });

    console.log('\n✅ Ready for CDN upload!');
  }

  async build(): Promise<boolean> {
    console.log('🚀 Starting FlexSearch Index Build');
    console.log('='.repeat(60));

    this.stats.buildTime = new Date().toISOString();

    try {
      // Create temp directory if it doesn't exist (for static mode)
      if (!fs.existsSync(TEMP_DIR)) {
        console.log(`📁 Creating temp directory: ${TEMP_DIR}`);
        fs.mkdirSync(TEMP_DIR, { recursive: true });
      }
      if (!fs.existsSync(TEMP_RAW_DIR)) {
        console.log(`📁 Creating temp raw directory: ${TEMP_RAW_DIR}`);
        fs.mkdirSync(TEMP_RAW_DIR, { recursive: true });
      }

      const addressSuccess = await this.buildAddressIndex();
      const parcelSuccess = await this.buildParcelMetadataIndex();
      const geometrySuccess = await this.buildParcelGeometryIndex();

      if (!addressSuccess) {
        throw new Error('Address index build failed');
      }

      if (!parcelSuccess) {
        console.warn('⚠️  Parcel metadata index build failed - continuing');
      }
      if (!geometrySuccess) {
        console.warn('⚠️  Geometry index build failed - continuing');
      }

      this.printSummary();

      console.log('\n✅ FlexSearch build completed successfully!');
      return true;
    } catch (error) {
      console.error('\n❌ FlexSearch build failed:', error);
      return false;
    }
  }
}

async function main(): Promise<void> {
  const builder = new FlexSearchBuilder();
  const success = await builder.build();
  process.exit(success ? 0 : 1);
}

// Run if this is the main module
if (process.argv[1] && process.argv[1].includes('flexsearch_builder')) {
  main().catch(console.error);
}

export { FlexSearchBuilder };
