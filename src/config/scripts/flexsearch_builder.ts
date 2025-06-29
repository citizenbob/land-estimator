#!/usr/bin/env node
/**
 * FlexSearch Index Builder for Ingest Pipeline
 *
 * This script builds FlexSearch indexes from integration data following
 * the patterns established in the experimental implementations.
 *
 * Input: /temp/raw/address_index.json (from integration bucket)
 * Output: /temp/address-index.json.gz (for CDN upload)
 */

import FlexSearch from 'flexsearch';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, 'temp');
const TEMP_RAW_DIR = path.join(TEMP_DIR, 'raw');
const OUTPUT_DIR = TEMP_DIR;

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
    console.log(`📤 Output directory: ${OUTPUT_DIR}`);
  }

  async buildAddressIndex(): Promise<boolean> {
    console.log('\n🏠 Building Address FlexSearch Index...');

    try {
      const addressIndexPath = path.join(TEMP_RAW_DIR, 'address_index.json');

      if (!fs.existsSync(addressIndexPath)) {
        throw new Error(`Address index not found: ${addressIndexPath}`);
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
      const compressedPath = path.join(OUTPUT_DIR, 'address-index.json.gz');
      fs.writeFileSync(compressedPath, compressed);

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
      const compressedPath = path.join(OUTPUT_DIR, 'parcel-metadata.json.gz');
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
      const compressedPath = path.join(OUTPUT_DIR, 'parcel-geometry.json.gz');
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
    flexIndex: FlexSearch.Index,
    searchStrings: string[]
  ): Promise<void> {
    console.log('\n🧪 Testing FlexSearch index...');

    try {
      const testQueries = ['626', '1st St', 'Main', 'Louis'];

      for (const query of testQueries) {
        const results = flexIndex.search(query, { limit: 3 });

        console.log(`   "${query}" → ${results.length} results`);
        if (results.length > 0 && searchStrings[results[0] as number]) {
          console.log(
            `      ${searchStrings[results[0] as number].substring(0, 50)}...`
          );
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
      const filePath = path.join(OUTPUT_DIR, file);
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
      if (!fs.existsSync(TEMP_DIR)) {
        throw new Error(`Temp directory not found: ${TEMP_DIR}`);
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { FlexSearchBuilder };
