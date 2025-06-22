#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { formatNumber, formatFileSize } from '@lib/formatUtils';
import type * as FlexSearch from 'flexsearch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Builds an optimized address index from address data for static serving.
 *
 * @throws {Error} When address data files are missing or malformed
 * @throws {Error} When output directory cannot be created or written to
 */
async function buildAddressIndex(): Promise<void> {
  const startTime = performance.now();

  console.log('🔧 Building Address Index...');

  const addressData = await loadAddressData();
  const parcelIds = Object.keys(addressData);

  console.log(`📂 Loaded ${formatNumber(parcelIds.length)} records`);

  const searchStrings = createSearchStrings(parcelIds, addressData);
  const indexData = createIndexDataStructure(parcelIds, searchStrings);
  await writeIndexFiles(indexData, startTime);
}

/**
 * Loads address data from the JSON index file.
 *
 * @returns {Promise<Record<string, string>>} Map of parcel IDs to address strings
 * @throws {Error} When address index file cannot be loaded or parsed
 */
async function loadAddressData(): Promise<Record<string, string>> {
  const addressIndexPath = path.join(__dirname, 'address_index.json');
  const addressIndexModule = await import(addressIndexPath);
  return addressIndexModule.default;
}

/**
 * Creates search strings optimized for address indexing.
 *
 * @param {string[]} parcelIds - Array of parcel identifiers
 * @param {Record<string, string>} addressData - Map of parcel IDs to addresses
 * @returns {string[]} Array of search strings combining address and parcel ID
 */
function createSearchStrings(
  parcelIds: string[],
  addressData: Record<string, string>
): string[] {
  console.log('🔄 Pre-computing search strings...');

  const searchStrings: string[] = [];
  const batchSize = 50000;

  for (let i = 0; i < parcelIds.length; i += batchSize) {
    const batch = parcelIds.slice(i, i + batchSize);

    for (const parcelId of batch) {
      const address = addressData[parcelId];
      searchStrings.push(`${address} ${parcelId}`);
    }

    const progress = (((i + batch.length) / parcelIds.length) * 100).toFixed(0);
    console.log(`   ${progress}% complete`);
  }

  return searchStrings;
}

/**
 * Creates the index data structure for JSON serialization.
 *
 * @param {string[]} parcelIds - Array of parcel identifiers
 * @param {string[]} searchStrings - Array of precomputed search strings
 * @returns {FlexSearch.PrecomputedIndexData} Index data structure with metadata
 */
function createIndexDataStructure(
  parcelIds: string[],
  searchStrings: string[]
): FlexSearch.PrecomputedIndexData {
  return {
    parcelIds: parcelIds,
    searchStrings: searchStrings,
    timestamp: new Date().toISOString(),
    recordCount: parcelIds.length,
    version: '3.0',
    exportMethod: 'index_optimized'
  };
}

/**
 * Writes index files to the public directory for static serving.
 *
 * @param {FlexSearch.PrecomputedIndexData} indexData - The index data structure to write
 * @param {number} startTime - Process start time for total duration calculation
 * @throws {Error} When files cannot be written or directories created
 */
async function writeIndexFiles(
  indexData: FlexSearch.PrecomputedIndexData,
  startTime: number
): Promise<void> {
  console.log('💾 Writing optimized files...');

  const projectRoot = path.join(__dirname, '..', '..');
  const publicDir = path.join(projectRoot, 'public');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const gzipOutputPath = path.join(publicDir, 'address-index.json.gz');

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
  console.log(`📊 ${formatNumber(recordCount)} records processed`);
  console.log(`💽 Output: ${gzipSize} gzipped (production-ready)`);
  console.log('🚀 Ready for sub-300ms cold start!');
}

buildAddressIndex();
