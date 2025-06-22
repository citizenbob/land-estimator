#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { formatNumber, formatFileSize } from '@lib/formatUtils';
import type { ParcelMetadata } from '@services/parcelMetadata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OptimizedParcelIndex {
  parcels: ParcelMetadata[];
  lookup: Record<string, number>; // parcel ID -> array index for fast lookups
  timestamp: string;
  recordCount: number;
  version: string;
  exportMethod: string;
}

/**
 * Builds an optimized parcel metadata index for static serving.
 *
 * @throws {Error} When parcel data files are missing or malformed
 * @throws {Error} When output directory cannot be created or written to
 */
async function buildParcelIndex(): Promise<void> {
  const startTime = performance.now();

  console.log('🔧 Building Parcel Metadata Index...');

  const parcelData = await loadParcelData();
  console.log(`📂 Loaded ${formatNumber(parcelData.length)} parcel records`);

  const optimizedIndex = createOptimizedIndex(parcelData);
  await writeIndexFiles(optimizedIndex, startTime);
}

/**
 * Loads raw parcel data from the JSON file.
 *
 * @returns {Promise<ParcelMetadata[]>} Array of parcel metadata records
 * @throws {Error} When parcel data file cannot be loaded or parsed
 */
async function loadParcelData(): Promise<ParcelMetadata[]> {
  const parcelDataPath = path.join(__dirname, 'parcel_metadata.json');
  const parcelDataModule = await import(parcelDataPath);
  const rawData = parcelDataModule.default || parcelDataModule;

  if (!Array.isArray(rawData)) {
    throw new Error('Parcel metadata must be an array');
  }

  console.log('🔄 Normalizing parcel data...');

  // Normalize the data to ensure consistent format
  const normalizedData: ParcelMetadata[] = rawData.map(
    (item: Record<string, unknown>, index: number) => {
      if (index % 10000 === 0) {
        const progress = ((index / rawData.length) * 100).toFixed(1);
        console.log(`   ${progress}% complete`);
      }

      return {
        id: String(item.id || ''),
        full_address: String(
          item.full_address || item.primary_full_address || ''
        ),
        latitude: Number(item.latitude || 0),
        longitude: Number(item.longitude || 0),
        region: String(item.region || ''),
        calc: item.calc as ParcelMetadata['calc'],
        owner: item.owner as ParcelMetadata['owner'],
        affluence_score: Number(item.affluence_score || 0),
        source_file: String(item.source_file || 'unknown'),
        processed_date: String(item.processed_date || new Date().toISOString())
      };
    }
  );

  return normalizedData;
}

/**
 * Creates an optimized index structure for fast lookups.
 *
 * @param {ParcelMetadata[]} parcelData - Array of normalized parcel records
 * @returns {OptimizedParcelIndex} Optimized index with lookup table
 */
function createOptimizedIndex(
  parcelData: ParcelMetadata[]
): OptimizedParcelIndex {
  console.log('🔄 Creating lookup index...');

  const lookup: Record<string, number> = {};

  parcelData.forEach((parcel, index) => {
    lookup[parcel.id] = index;
  });

  return {
    parcels: parcelData,
    lookup: lookup,
    timestamp: new Date().toISOString(),
    recordCount: parcelData.length,
    version: '1.0',
    exportMethod: 'optimized_index'
  };
}

/**
 * Writes optimized index files to the public directory for static serving.
 *
 * @param {OptimizedParcelIndex} indexData - The optimized index data structure
 * @param {number} startTime - Process start time for total duration calculation
 * @throws {Error} When files cannot be written or directories created
 */
async function writeIndexFiles(
  indexData: OptimizedParcelIndex,
  startTime: number
): Promise<void> {
  console.log('💾 Writing optimized files...');

  const projectRoot = path.join(__dirname, '..', '..');
  const publicDir = path.join(projectRoot, 'public');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const gzipOutputPath = path.join(publicDir, 'parcel-metadata.json.gz');

  const jsonString = JSON.stringify(indexData);
  const gzipped = zlib.gzipSync(jsonString, { level: 9 });
  fs.writeFileSync(gzipOutputPath, gzipped);

  const gzipFileStats = fs.statSync(gzipOutputPath);
  const gzipSize = formatFileSize(gzipFileStats.size);

  logCompletionSummary(startTime, indexData.recordCount, gzipSize);
}

function logCompletionSummary(
  startTime: number,
  recordCount: number,
  gzipSize: string
): void {
  const endTime = performance.now();
  const totalTime = Math.round(endTime - startTime);

  console.log(`✅ Build completed in ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`📊 ${formatNumber(recordCount)} parcel records processed`);
  console.log(`💽 Output: ${gzipSize} gzipped (production-ready)`);
  console.log('🚀 Ready for ultra-fast parcel metadata lookups!');
}

buildParcelIndex();
