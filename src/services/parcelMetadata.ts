import { createUniversalBundleLoader } from '@lib/universalBundleLoader';
import { AppError, ErrorType } from '@lib/errorUtils';
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
 * Parcel metadata fallback - attempts to load from local backup if available
 * @throws When no fallback data is available
 */
async function loadRawParcelData(): Promise<ParcelMetadata[]> {
  // Try to load from emergency backup file if available
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/parcel-metadata-backup.json.gz');
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const { decompressJsonData } = await import('@lib/universalLoader');
        const decompressed = decompressJsonData<OptimizedParcelIndex>(
          new Uint8Array(arrayBuffer)
        );
        console.log('🚨 Using emergency backup parcel metadata');
        return decompressed.parcels;
      }
    } catch (error) {
      console.warn('Emergency backup not available:', error);
    }
  }

  throw new AppError(
    'Parcel metadata requires optimized .gz data - no fallback available. CDN may be temporarily unavailable.',
    ErrorType.VALIDATION,
    { isRetryable: true }
  );
}

const parcelBundleLoader = createUniversalBundleLoader<
  ParcelMetadata,
  OptimizedParcelIndex,
  ParcelBundle
>({
  gzippedFilename: 'parcel-metadata.json.gz',
  baseFilename: 'parcel-metadata',
  useVersioning: process.env.NODE_ENV === 'production',
  createLookupMap: createParcelLookupMap,
  loadRawData: loadRawParcelData,
  extractDataFromIndex: (index: OptimizedParcelIndex) => index.parcels,
  createBundle: (
    data: ParcelMetadata[],
    lookup: Record<string, ParcelMetadata>
  ) => ({ data, lookup })
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
