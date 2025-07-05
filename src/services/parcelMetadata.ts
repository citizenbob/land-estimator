import {
  loadVersionedBundle,
  clearMemoryCache
} from '@workers/versionedBundleLoader';

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
 * Configuration for parcel metadata bundle loading
 */
const parcelBundleConfig = {
  baseFilename: 'parcel-metadata',
  createLookupMap: createParcelLookupMap,
  extractDataFromIndex: (
    index: OptimizedParcelIndex | ParcelMetadata[] | unknown
  ) => {
    console.log('🔍 [DEBUG] Parcel index structure:', {
      type: typeof index,
      isArray: Array.isArray(index),
      keys: typeof index === 'object' && index ? Object.keys(index) : 'N/A'
    });

    if (Array.isArray(index)) {
      console.log('🔧 [DEBUG] Index is array, using directly');
      return index;
    }

    if (index && typeof index === 'object' && 'parcels' in index) {
      const typedIndex = index as OptimizedParcelIndex;
      console.log('🔧 [DEBUG] Found parcels property, checking if array:', {
        parcelsType: typeof typedIndex.parcels,
        isArray: Array.isArray(typedIndex.parcels),
        length: Array.isArray(typedIndex.parcels)
          ? typedIndex.parcels.length
          : 'N/A',
        parcelsValue: typedIndex.parcels ? 'exists' : 'null/undefined',
        firstFewKeys:
          typedIndex.parcels && typeof typedIndex.parcels === 'object'
            ? Object.keys(typedIndex.parcels).slice(0, 5)
            : 'N/A'
      });

      if (Array.isArray(typedIndex.parcels)) {
        console.log('🔧 [DEBUG] Found parcels array in index');
        return typedIndex.parcels;
      } else if (typedIndex.parcels && typeof typedIndex.parcels === 'object') {
        console.log('🔧 [DEBUG] parcels is object, converting to array');
        const parcelsArray = Object.values(
          typedIndex.parcels
        ) as ParcelMetadata[];
        console.log('🔧 [DEBUG] Converted parcels object to array:', {
          length: parcelsArray.length
        });
        return parcelsArray;
      } else {
        console.log(
          '❌ [DEBUG] parcels property exists but is not an array or object'
        );
      }
    }

    if (index && typeof index === 'object') {
      const indexObj = index as Record<string, unknown>;
      const firstKey = Object.keys(indexObj)[0];
      if (firstKey && Array.isArray(indexObj[firstKey])) {
        console.log('🔧 [DEBUG] Using first array property:', firstKey);
        return indexObj[firstKey] as ParcelMetadata[];
      }
    }

    console.error('❌ [DEBUG] Could not find parcels array in index structure');
    throw new Error(`Invalid parcel index structure: ${typeof index}`);
  },
  createBundle: (
    data: ParcelMetadata[],
    lookup: Record<string, ParcelMetadata>
  ) => ({ data, lookup })
};

/**
 * Universal parcel metadata loader that works in both browser and Node.js environments
 * Enhanced with Service Worker integration for better caching
 * @returns Complete parcel bundle with data array and lookup map
 * @throws When parcel files cannot be loaded, decompressed, or parsed
 */
export async function loadParcelMetadata(): Promise<ParcelBundle> {
  if (process.env.NODE_ENV === 'production') {
    if (typeof window !== 'undefined') {
      try {
        const { default: serviceWorkerClient } = await import(
          '@workers/serviceWorkerClient'
        );

        const { getVersionManifest } = await import(
          '@services/versionManifest'
        );
        const manifest = await getVersionManifest();
        const url = manifest.current.files.parcel_metadata;

        if (url && (await serviceWorkerClient.isCached(url))) {
          console.log(
            '🎯 [SW] Parcel metadata available in Service Worker cache'
          );
        }

        await serviceWorkerClient.warmupCache();
      } catch (error) {
        console.warn(
          '[Parcel Metadata] Service Worker integration failed:',
          error
        );
      }
    }

    return loadVersionedBundle(parcelBundleConfig);
  }

  if (process.env.NODE_ENV === 'test') {
    return loadVersionedBundle(parcelBundleConfig);
  }

  console.log('🌐 [DEV] Using CDN loader in development mode for reliability');
  return loadVersionedBundle(parcelBundleConfig);
}

/**
 * Clears the cached parcel bundle
 */
export function clearParcelMetadataCache(): void {
  clearMemoryCache();
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
