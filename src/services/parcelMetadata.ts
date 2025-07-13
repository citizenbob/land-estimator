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

// Legacy interfaces kept for backward compatibility but not used in disabled service

// Configuration removed as parcel metadata service is now disabled

/**
 * Universal parcel metadata loader that works in both browser and Node.js environments
 * Enhanced with Service Worker integration for better caching
 * @returns Complete parcel bundle with data array and lookup map
 * @throws When parcel files cannot be loaded, decompressed, or parsed
 */
export async function loadParcelMetadata(): Promise<never> {
  if (process.env.NODE_ENV === 'production') {
    if (typeof window !== 'undefined') {
      try {
        const { default: serviceWorkerClient } = await import(
          '@workers/serviceWorkerClient'
        );

        // Note: Parcel metadata loading is disabled in the current architecture
        // This service worker integration is kept for future use
        await serviceWorkerClient.warmupCache();
      } catch (error) {
        console.warn(
          '[Parcel Metadata] Service Worker integration failed:',
          error
        );
      }
    }

    throw new Error(
      'Parcel metadata service is disabled in the current architecture'
    );
  }

  if (process.env.NODE_ENV === 'test') {
    throw new Error(
      'Parcel metadata service is disabled in the current architecture'
    );
  }

  console.log(
    '🌐 [DEV] Parcel metadata service is disabled in the current architecture'
  );
  throw new Error(
    'Parcel metadata service is disabled in the current architecture'
  );
}

/**
 * Clears the cached parcel bundle
 */
export function clearParcelMetadataCache(): void {
  // Note: Parcel metadata service is disabled in the current architecture
  console.warn('clearParcelMetadataCache called but service is disabled');
}

/**
 * Get detailed parcel metadata by ID
 * @returns Always throws error - service is disabled
 */
export async function getParcelMetadata(): Promise<ParcelMetadata | null> {
  throw new Error(
    'Parcel metadata service is disabled. Use the simplified address lookup instead.'
  );
}

/**
 * Get parcel metadata for multiple IDs
 * @returns Always throws error - service is disabled
 */
export async function getBulkParcelMetadata(): Promise<ParcelMetadata[]> {
  throw new Error(
    'Parcel metadata service is disabled. Use the simplified address lookup instead.'
  );
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
