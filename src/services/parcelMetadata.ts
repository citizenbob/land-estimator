export interface ParcelMetadata {
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

interface OptimizedParcelIndex {
  parcels: ParcelMetadata[];
  lookup: Record<string, number>;
  timestamp: string;
  recordCount: number;
  version: string;
  exportMethod: string;
}

let parcelData: ParcelMetadata[] | null = null;
let parcelLookup: Record<string, ParcelMetadata> | null = null;

/**
 * Determines if we're running in a Node.js environment
 */
function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined;
}

async function loadParcelMetadata(): Promise<void> {
  if (parcelData && parcelLookup) {
    return;
  }

  try {
    try {
      const optimizedIndex = await loadOptimizedIndex();
      if (optimizedIndex) {
        parcelData = optimizedIndex.parcels;
        parcelLookup = {};

        optimizedIndex.parcels.forEach((parcel) => {
          parcelLookup![parcel.id] = parcel;
        });

        console.log(
          `📦 Loaded ${optimizedIndex.recordCount} parcels from optimized index (v${optimizedIndex.version})`
        );
        return;
      }
    } catch (error) {
      console.warn(
        'Optimized parcel index not available, falling back to raw data:',
        error
      );
    }

    await loadRawParcelData();
  } catch (error) {
    console.error('Failed to load parcel metadata:', error);
    throw error;
  }
}

/**
 * Attempts to load the optimized parcel index from the public directory
 */
async function loadOptimizedIndex(): Promise<OptimizedParcelIndex | null> {
  if (!isNode()) {
    return null;
  }

  const fs = await import('fs');
  const path = await import('path');
  const { decompressSync } = await import('fflate');

  const indexPath = path.join(
    process.cwd(),
    'public',
    'parcel-metadata.json.gz'
  );

  if (!fs.existsSync(indexPath)) {
    return null;
  }

  const compressedData = fs.readFileSync(indexPath);
  const decompressedData = decompressSync(compressedData);
  const jsonString = new TextDecoder().decode(decompressedData);

  return JSON.parse(jsonString) as OptimizedParcelIndex;
}

/**
 * Loads raw parcel data as fallback
 */
async function loadRawParcelData(): Promise<void> {
  const parcelMetadataModule = await import('@data/parcel_metadata.json');
  const rawData = parcelMetadataModule.default || parcelMetadataModule;

  if (!Array.isArray(rawData)) {
    throw new Error('Parcel metadata must be an array');
  }

  console.log('🔄 Processing raw parcel data...');

  parcelData = rawData.map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    full_address: String(item.full_address || item.primary_full_address || ''),
    latitude: Number(item.latitude || 0),
    longitude: Number(item.longitude || 0),
    region: String(item.region || ''),
    calc: item.calc as ParcelMetadata['calc'],
    owner: item.owner as ParcelMetadata['owner'],
    affluence_score: Number(item.affluence_score || 0),
    source_file: String(item.source_file || 'unknown'),
    processed_date: String(item.processed_date || new Date().toISOString())
  }));

  parcelLookup = {};
  if (parcelData) {
    parcelData.forEach((parcel) => {
      parcelLookup![parcel.id] = parcel;
    });
  }

  console.log(`📦 Loaded ${parcelData.length} parcels from raw data`);
}

/**
 * Get detailed parcel metadata by ID
 *
 * @param {string} parcelId - The parcel ID to look up
 * @returns {Promise<ParcelMetadata | null>} ParcelMetadata object or null if not found
 */
export async function getParcelMetadata(
  parcelId: string
): Promise<ParcelMetadata | null> {
  await loadParcelMetadata();

  if (!parcelLookup) {
    return null;
  }

  return parcelLookup[parcelId] || null;
}

/**
 * Get parcel metadata for multiple IDs
 *
 * @param {string[]} parcelIds - Array of parcel IDs to look up
 * @returns {Promise<ParcelMetadata[]>} Array of ParcelMetadata objects (excludes not found)
 */
export async function getBulkParcelMetadata(
  parcelIds: string[]
): Promise<ParcelMetadata[]> {
  await loadParcelMetadata();

  if (!parcelLookup) {
    return [];
  }

  return parcelIds
    .map((id) => parcelLookup![id])
    .filter((parcel): parcel is ParcelMetadata => parcel !== undefined);
}

/**
 * Calculate landscape estimate using parcel data
 *
 * @param {ParcelMetadata} parcel - The parcel metadata
 * @returns {[string, string, string, string]} Bounding box coordinates as strings
 */
export function createBoundingBoxFromParcel(
  parcel: ParcelMetadata
): [string, string, string, string] {
  const latOffset = 0.001;
  const lonOffset = 0.001;

  const lat = parcel.latitude;
  const lon = parcel.longitude;

  return [
    (lat - latOffset).toString(),
    (lat + latOffset).toString(),
    (lon - lonOffset).toString(),
    (lon + lonOffset).toString()
  ];
}
