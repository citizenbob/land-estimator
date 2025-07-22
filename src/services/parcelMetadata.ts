// Raw parcel data structure from Vercel Blob
interface RawParcelData {
  id: string;
  primary_full_address: string;
  latitude: number;
  longitude: number;
  region: string;
  calc: {
    landarea_sqft: number;
    building_sqft: number;
    estimated_landscapable_area_sqft: number;
    property_type: string;
  };
  owner: {
    name: string;
  };
  affluence_score: number;
  source_file?: string;
  processed_date?: string;
}

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
    // Load from Vercel Blob storage - regional gzipped files
    const regions = ['stl_city', 'stl_county'];
    // Load all parcels for all regions
    let allParcels: ParcelMetadata[] = [];

    for (const region of regions) {
      try {
        const blobUrl = `https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/${region}-parcel_metadata.json.gz`;
        console.log(`🔍 Fetching ${region} from:`, blobUrl);

        const response = await fetch(blobUrl);
        console.log(`📡 Response status for ${region}:`, response.status);
        console.log(
          `📡 Response headers for ${region}:`,
          Object.fromEntries(response.headers.entries())
        );

        if (!response.ok) {
          console.warn(`Failed to load ${region} data: ${response.status}`);
          continue;
        }

        // Handle gzipped response - check if DecompressionStream is available
        console.log(
          '🔧 DecompressionStream available:',
          typeof DecompressionStream !== 'undefined'
        );

        let text: string;
        if (typeof DecompressionStream !== 'undefined') {
          // Browser/modern environment
          const decompressed = response.body?.pipeThrough(
            new DecompressionStream('gzip')
          );
          text = await new Response(decompressed).text();
        } else {
          // Node.js environment - try using zlib
          const { gunzip } = await import('zlib');
          const { promisify } = await import('util');
          const gunzipAsync = promisify(gunzip);

          const buffer = await response.arrayBuffer();
          const decompressed = await gunzipAsync(Buffer.from(buffer));
          text = decompressed.toString('utf-8');
        }
        console.log(`📄 Text length for ${region}:`, text.length);
        console.log(`📄 Text preview for ${region}:`, text.substring(0, 200));

        const regionData = JSON.parse(text);
        console.log(
          `🔧 Parsed data structure for ${region}:`,
          Object.keys(regionData)
        );

        // Extract parcels from nested structure and map field names
        const rawParcels = Object.values(
          regionData.parcels || {}
        ) as RawParcelData[];
        const parcels: ParcelMetadata[] = rawParcels.map((rawParcel) => ({
          id: rawParcel.id,
          full_address: rawParcel.primary_full_address,
          latitude: rawParcel.latitude,
          longitude: rawParcel.longitude,
          region: rawParcel.region,
          calc: {
            landarea: rawParcel.calc?.landarea_sqft || 0,
            building_sqft: rawParcel.calc?.building_sqft || 0,
            estimated_landscapable_area:
              rawParcel.calc?.estimated_landscapable_area_sqft || 0,
            property_type: rawParcel.calc?.property_type || 'unknown'
          },
          owner: {
            name: rawParcel.owner?.name || 'Unknown'
          },
          affluence_score: rawParcel.affluence_score || 0,
          source_file: rawParcel.source_file || region,
          processed_date: rawParcel.processed_date || new Date().toISOString()
        }));
        // Use concat to avoid stack overflow with large datasets
        allParcels = allParcels.concat(parcels);

        console.log(`✅ Loaded ${parcels.length} parcels from ${region}`);
      } catch (error) {
        console.error(`❌ Failed to load ${region} parcel data:`, error);
      }
    }

    const parcelData = allParcels;

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
