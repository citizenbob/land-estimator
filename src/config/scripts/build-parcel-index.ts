#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local BEFORE importing Firebase
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import type { ParcelMetadata } from '@services/parcelMetadata';
import {
  publicFileExists,
  loadDataWithFallback,
  writeGzippedJson,
  logBuildCompletion,
  createIndexStructure,
  formatNumber
} from './buildUtils';

// Type definitions for this build script
type OptimizedParcelIndex = {
  parcels: ParcelMetadata[];
  lookup: Record<string, number>;
  timestamp: string;
  recordCount: number;
  version: string;
  exportMethod: string;
};

type UltraCompressedParcel = {
  /** id */
  i: string;
  /** address */
  a: string;
  /** latitude */
  t: number;
  /** longitude */
  g: number;
  /** region */
  r?: string;
  /** landarea */
  l?: number;
  /** building_sqft */
  b?: number;
  /** estimated_landscapable_area */
  e?: number;
  /** property_type */
  p?: string;
  /** owner name */
  o?: string;
  /** affluence_score */
  s?: number;
};

/**
 * Builds an optimized parcel metadata index for static serving.
 */
async function buildParcelIndex(): Promise<void> {
  const startTime = performance.now();
  console.log('🔧 Building Parcel Metadata Index...');

  const outputFile = 'parcel-metadata.json.gz';
  if (publicFileExists(outputFile)) {
    console.log('✅ Parcel metadata index already exists, skipping build');
    return;
  }

  const parcelData = await loadDataWithFallback<ParcelMetadata[]>(
    'parcel_metadata.json',
    'parcel_metadata',
    'parcel metadata'
  );

  console.log(`📂 Loaded ${formatNumber(parcelData.length)} parcel records`);

  const optimizedIndex = createOptimizedIndex(parcelData);
  const ultraCompressed = createUltraCompressedData(parcelData);

  const ultraIndex = createIndexStructure(
    {
      parcels: ultraCompressed,
      lookup: optimizedIndex.lookup
    },
    optimizedIndex.version,
    'ultra-compressed',
    optimizedIndex.recordCount
  );

  await writeIndexFiles(optimizedIndex, startTime);
  await writeUltraCompressedFiles(ultraIndex);
}

/**
 * Creates an optimized index structure for fast lookups.
 */
function createOptimizedIndex(
  parcelData: ParcelMetadata[]
): OptimizedParcelIndex {
  console.log('🔄 Creating lookup index...');

  const lookup: Record<string, number> = {};
  parcelData.forEach((parcel, index) => {
    lookup[parcel.id] = index;
  });

  return createIndexStructure(
    {
      parcels: parcelData,
      lookup: lookup
    },
    '1.0',
    'optimized_index',
    parcelData.length
  ) as OptimizedParcelIndex;
}

/**
 * Creates an ultra-compressed version with shorter keys and minimal data
 */
function createUltraCompressedData(
  parcelData: ParcelMetadata[]
): UltraCompressedParcel[] {
  console.log('🗜️ Creating ultra-compressed format...');

  const compressed = parcelData.map((p) => {
    const result: Partial<UltraCompressedParcel> = {
      i: p.id,
      a: p.full_address || '',
      t: p.latitude,
      g: p.longitude
    };

    // Only include optional fields if they have meaningful values
    if (p.region && p.region !== '') result.r = p.region;
    if (p.calc?.landarea && p.calc.landarea > 0)
      result.l = Math.round(p.calc.landarea);
    if (p.calc?.building_sqft && p.calc.building_sqft > 0)
      result.b = Math.round(p.calc.building_sqft);
    if (
      p.calc?.estimated_landscapable_area &&
      p.calc.estimated_landscapable_area > 0
    ) {
      result.e = Math.round(p.calc.estimated_landscapable_area);
    }
    if (p.calc?.property_type && p.calc.property_type !== '')
      result.p = p.calc.property_type;
    if (p.owner?.name && p.owner.name !== '') result.o = p.owner.name;
    if (p.affluence_score && p.affluence_score > 0) {
      result.s = Math.round(p.affluence_score * 100) / 100;
    }

    return result as UltraCompressedParcel;
  });

  return compressed;
}

/**
 * Writes optimized index files to the public directory for static serving.
 */
async function writeIndexFiles(
  indexData: OptimizedParcelIndex,
  startTime: number
): Promise<void> {
  console.log('💾 Writing optimized files...');

  const { size } = writeGzippedJson('parcel-metadata.json.gz', indexData);

  logBuildCompletion(
    'Parcel metadata',
    startTime,
    indexData.recordCount,
    `${(size / 1024 / 1024).toFixed(2)} MB`,
    '🚀 Ready for ultra-fast parcel metadata lookups!'
  );
}

/**
 * Writes ultra-compressed index files with maximum compression
 */
async function writeUltraCompressedFiles(ultraIndex: {
  parcels: UltraCompressedParcel[];
  lookup: Record<string, number>;
  timestamp: string;
  recordCount: number;
  version: string;
  exportMethod: string;
}): Promise<void> {
  console.log('🗜️ Writing ultra-compressed files...');

  const { size } = writeGzippedJson(
    'parcel-metadata-ultra.json.gz',
    ultraIndex
  );

  console.log(
    `💾 Ultra-compressed: ${(size / 1024 / 1024).toFixed(2)} MB (${formatNumber(ultraIndex.recordCount)} records)`
  );

  const originalSize = JSON.stringify(ultraIndex).length;
  const compressionRatio = (
    ((originalSize - size) / originalSize) *
    100
  ).toFixed(1);
  console.log(`🗜️ Ultra compression ratio: ${compressionRatio}%`);
}

buildParcelIndex();
