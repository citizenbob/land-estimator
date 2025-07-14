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

// Parcel metadata cache
let parcelMetadataCache: Map<string, ParcelMetadata> | null = null;

/**
 * Universal parcel metadata loader that works in both browser and Node.js environments
 * Enhanced with Service Worker integration for better caching
 * @returns Complete parcel bundle with data array and lookup map
 * @throws When parcel files cannot be loaded, decompressed, or parsed
 */
export async function loadParcelMetadata(): Promise<
  Map<string, ParcelMetadata>
> {
  if (parcelMetadataCache) {
    console.log('⚡ Using cached parcel metadata');
    return parcelMetadataCache;
  }

  console.log('🚀 Loading parcel metadata from cold storage...');

  try {
    // Load from CDN/cold storage - check multiple possible endpoints
    let response: Response;
    const endpoints = [
      'https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/cdn/parcel/latest.json',
      '/parcel/latest.json',
      '/data/parcel/latest.json',
      '/public/parcel/latest.json'
    ];

    let lastError: Error | null = null;
    for (const endpoint of endpoints) {
      try {
        response = await fetch(endpoint);
        if (response.ok) break;
      } catch (error) {
        lastError = error as Error;
        continue;
      }
    }

    if (!response! || !response.ok) {
      throw new Error(
        `Failed to load parcel metadata from any endpoint. Last error: ${lastError?.message}`
      );
    }

    const parcelData: ParcelMetadata[] = await response.json();

    // Create lookup map
    parcelMetadataCache = new Map();
    for (const parcel of parcelData) {
      parcelMetadataCache.set(parcel.id, parcel);
    }

    console.log(
      `✅ Loaded ${parcelData.length} parcel records from cold storage`
    );
    return parcelMetadataCache;
  } catch (error) {
    console.error('❌ Failed to load parcel metadata:', error);
    throw error;
  }
}

/**
 * Clears the cached parcel bundle
 */
export function clearParcelMetadataCache(): void {
  parcelMetadataCache = null;
  console.log('🗑️ Parcel metadata cache cleared');
}

/**
 * Get detailed parcel metadata by ID
 * @param parcelId - The parcel ID to lookup
 * @returns Parcel metadata or null if not found
 */
export async function getParcelMetadata(
  parcelId: string
): Promise<ParcelMetadata | null> {
  if (!parcelId) {
    return null;
  }

  try {
    const parcelMap = await loadParcelMetadata();
    const parcel = parcelMap.get(parcelId);

    if (parcel) {
      console.log(`📦 Found parcel metadata for ID: ${parcelId}`);
    } else {
      console.warn(`⚠️ No parcel metadata found for ID: ${parcelId}`);
    }

    return parcel || null;
  } catch (error) {
    console.error(
      `❌ Failed to get parcel metadata for ID ${parcelId}:`,
      error
    );
    return null;
  }
}

/**
 * Get parcel metadata for multiple IDs
 * @param parcelIds - Array of parcel IDs to lookup
 * @returns Array of parcel metadata (excluding not found)
 */
export async function getBulkParcelMetadata(
  parcelIds: string[]
): Promise<ParcelMetadata[]> {
  if (!parcelIds || parcelIds.length === 0) {
    return [];
  }

  try {
    const parcelMap = await loadParcelMetadata();
    const results: ParcelMetadata[] = [];

    for (const id of parcelIds) {
      const parcel = parcelMap.get(id);
      if (parcel) {
        results.push(parcel);
      }
    }

    console.log(
      `📦 Found ${results.length}/${parcelIds.length} parcel records`
    );
    return results;
  } catch (error) {
    console.error('❌ Failed to get bulk parcel metadata:', error);
    return [];
  }
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
