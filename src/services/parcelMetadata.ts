import { createUniversalBundleLoader } from '@lib/universalBundleLoader';
import type { NodeModules } from '@lib/universalLoader';

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

interface ParcelBundle {
  data: ParcelMetadata[];
  lookup: Record<string, ParcelMetadata>;
}

/**
 * Creates parcel lookup map for fast ID-based access
 * @param parcels Array of parcel metadata
 * @returns Map of parcel IDs to parcel metadata
 */
function createParcelLookupMap(
  parcels: ParcelMetadata[]
): Record<string, ParcelMetadata> {
  const lookup: Record<string, ParcelMetadata> = {};
  parcels.forEach((parcel) => {
    lookup[parcel.id] = parcel;
  });
  return lookup;
}

/**
 * Loads raw parcel data as fallback when optimized index is not available
 * @returns Array of parcel metadata from raw data
 * @throws When raw parcel data cannot be loaded or is invalid
 */
async function loadRawParcelData(): Promise<ParcelMetadata[]> {
  try {
    const parcelMetadataModule = await import('@data/parcel_metadata.json');
    const rawData = parcelMetadataModule.default || parcelMetadataModule;

    if (!Array.isArray(rawData)) {
      throw new Error('Parcel metadata must be an array');
    }

    return rawData.map((item: Record<string, unknown>) => ({
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
    }));
  } catch (error) {
    throw new Error(`Failed to load raw parcel data: ${error}`);
  }
}

const parcelBundleLoader = createUniversalBundleLoader<
  ParcelMetadata,
  OptimizedParcelIndex,
  ParcelBundle
>({
  gzippedFilename: 'parcel-metadata.json.gz',
  createLookupMap: createParcelLookupMap,
  loadRawData: loadRawParcelData,
  extractDataFromIndex: (index) => index.parcels,
  createBundle: (data, lookup) => ({ data, lookup })
});

/**
 * Sets mock Node.js modules for testing
 */
export function _setTestMockParcelNodeModules(
  mockModules: NodeModules | null
): void {
  parcelBundleLoader.setTestMockModules(mockModules);
}

/**
 * Universal parcel metadata loader that works in both browser and Node.js environments
 * @returns Complete parcel bundle with data array and lookup map
 * @throws When parcel files cannot be loaded, decompressed, or parsed
 */
export async function loadParcelMetadata(): Promise<ParcelBundle> {
  return parcelBundleLoader.loadBundle();
}

/**
 * Clears the cached parcel bundle
 */
export function clearParcelMetadataCache(): void {
  parcelBundleLoader.clearCache();
}

/**
 * Get detailed parcel metadata by ID
 * @param parcelId The parcel ID to look up
 * @returns ParcelMetadata object or null if not found
 */
export async function getParcelMetadata(
  parcelId: string
): Promise<ParcelMetadata | null> {
  const bundle = await loadParcelMetadata();
  return bundle.lookup[parcelId] || null;
}

/**
 * Get parcel metadata for multiple IDs
 * @param parcelIds Array of parcel IDs to look up
 * @returns Array of ParcelMetadata objects (excludes not found)
 */
export async function getBulkParcelMetadata(
  parcelIds: string[]
): Promise<ParcelMetadata[]> {
  const bundle = await loadParcelMetadata();

  return parcelIds
    .map((id) => bundle.lookup[id])
    .filter((parcel): parcel is ParcelMetadata => parcel !== undefined);
}

/**
 * Create bounding box coordinates from parcel data
 * @param parcel The parcel metadata
 * @returns Bounding box coordinates as strings [minLat, maxLat, minLon, maxLon]
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
