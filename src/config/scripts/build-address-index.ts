#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local BEFORE importing Firebase
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import type * as FlexSearch from 'flexsearch';
import {
  publicFileExists,
  loadDataWithFallback,
  writeGzippedJson,
  logBuildCompletion,
  createIndexStructure,
  formatNumber,
  processBatches
} from './buildUtils';

/**
 * Builds an optimized address index from address data for static serving.
 */
async function buildAddressIndex(): Promise<void> {
  const startTime = performance.now();
  console.log('🔧 Building Address Index...');

  const outputFile = 'address-index.json.gz';
  if (publicFileExists(outputFile)) {
    console.log('✅ Address index already exists, skipping build');
    return;
  }

  const addressData = await loadDataWithFallback<Record<string, string>>(
    'address_index.json',
    'address_index',
    'address index'
  );

  const parcelIds = Object.keys(addressData);
  console.log(`📂 Loaded ${formatNumber(parcelIds.length)} records`);

  const searchStrings = createSearchStrings(parcelIds, addressData);
  const indexData = createIndexDataStructure(parcelIds, searchStrings);

  await writeIndexFiles(indexData, startTime);
}

/**
 * Creates search strings optimized for address indexing.
 */
function createSearchStrings(
  parcelIds: string[],
  addressData: Record<string, string>
): string[] {
  console.log('🔄 Pre-computing search strings...');

  return processBatches(
    parcelIds,
    50000,
    (batch) => batch.map((parcelId) => `${addressData[parcelId]} ${parcelId}`),
    'Search strings'
  );
}

/**
 * Creates the index data structure for JSON serialization.
 */
function createIndexDataStructure(
  parcelIds: string[],
  searchStrings: string[]
): FlexSearch.PrecomputedIndexData {
  return createIndexStructure(
    {
      parcelIds: parcelIds,
      searchStrings: searchStrings
    },
    '3.0',
    'index_optimized',
    parcelIds.length
  ) as FlexSearch.PrecomputedIndexData;
}

/**
 * Writes index files to the public directory for static serving.
 */
async function writeIndexFiles(
  indexData: FlexSearch.PrecomputedIndexData,
  startTime: number
): Promise<void> {
  console.log('💾 Writing optimized files...');

  const { size } = writeGzippedJson('address-index.json.gz', indexData);

  logBuildCompletion(
    'Address index',
    startTime,
    indexData.recordCount,
    `${(size / 1024 / 1024).toFixed(2)} MB`,
    '🚀 Ready for sub-300ms cold start!'
  );
}

buildAddressIndex();
