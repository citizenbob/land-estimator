import type {
  RawParcelData,
  ParcelMetadata,
  ParcelRegion
} from '@app-types/parcel-index';
import { createNetworkError } from '@lib/errorUtils';

/**
 * Transform raw parcel data to processed parcel metadata
 * @param rawParcel - Raw parcel data from storage
 * @param defaultRegion - Default region if not specified
 * @returns Processed parcel metadata
 */
function transformRawParcelData(
  rawParcel: RawParcelData,
  defaultRegion: string
): ParcelMetadata {
  return {
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
    source_file: rawParcel.source_file || defaultRegion,
    processed_date: rawParcel.processed_date || new Date().toISOString()
  };
}

let stlCityCache: Map<string, ParcelMetadata> | null = null;
let stlCountyCache: Map<string, ParcelMetadata> | null = null;

/**
 * Determine which region a parcel belongs to based on ID patterns
 * @param parcelId - The parcel ID
 * @returns Region identifier
 */
function determineRegionFromParcelId(parcelId: string): ParcelRegion {
  if (/^[0-9]+$/.test(parcelId) && parcelId.length <= 11) {
    return 'stl_city';
  }
  return 'stl_county';
}

/**
 * Load and cache data for a specific region only
 * @param region - Region to load
 * @returns Map of parcel data for that region
 */
async function loadRegionData(
  region: ParcelRegion
): Promise<Map<string, ParcelMetadata>> {
  const cache = region === 'stl_city' ? stlCityCache : stlCountyCache;

  if (cache) {
    console.log(`⚡ Using cached ${region} data`);
    return cache;
  }

  console.log(`🚀 Loading ${region} data from cold storage...`);

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
      throw createNetworkError(
        `Failed to load ${region} data: ${response.status}`,
        {
          url: blobUrl,
          region,
          status: response.status,
          statusText: response.statusText
        }
      );
    }

    let text: string;
    if (typeof DecompressionStream !== 'undefined') {
      const decompressed = response.body?.pipeThrough(
        new DecompressionStream('gzip')
      );
      text = await new Response(decompressed).text();
    } else {
      const { gunzip } = await import('zlib');
      const { promisify } = await import('util');
      const gunzipAsync = promisify(gunzip);
      const buffer = await response.arrayBuffer();
      const decompressed = await gunzipAsync(Buffer.from(buffer));
      text = decompressed.toString('utf-8');
    }

    console.log(`📄 Text length for ${region}:`, text.length);

    const regionData = JSON.parse(text);
    const rawParcels = Object.values(
      regionData.parcels || {}
    ) as RawParcelData[];

    const regionCache = new Map<string, ParcelMetadata>();

    for (const rawParcel of rawParcels) {
      const parcel = transformRawParcelData(rawParcel, region);
      regionCache.set(parcel.id, parcel);
    }

    if (region === 'stl_city') {
      stlCityCache = regionCache;
    } else {
      stlCountyCache = regionCache;
    }

    console.log(`✅ Loaded ${regionCache.size} parcels from ${region}`);
    return regionCache;
  } catch (error) {
    console.error(`❌ Failed to load ${region} parcel data:`, error);
    throw error;
  }
}

/**
 * Get parcel from specific region with optimized loading
 * @param parcelId - The parcel ID
 * @param region - The region to search in
 * @returns Parcel metadata or null
 */
async function getParcelFromSpecificRegion(
  parcelId: string,
  region: ParcelRegion
): Promise<ParcelMetadata | null> {
  try {
    const regionData = await loadRegionData(region);
    const parcel = regionData.get(parcelId);

    if (!parcel && region === 'stl_city') {
      console.log(`🔄 Parcel ${parcelId} not found in city, trying county...`);
      const countyData = await loadRegionData('stl_county');
      return countyData.get(parcelId) || null;
    }

    if (!parcel && region === 'stl_county') {
      console.log(`🔄 Parcel ${parcelId} not found in county, trying city...`);
      const cityData = await loadRegionData('stl_city');
      return cityData.get(parcelId) || null;
    }

    return parcel || null;
  } catch (error) {
    console.error(`❌ Failed to get parcel from ${region}:`, error);
    return null;
  }
}

export function clearParcelMetadataCache(): void {
  stlCityCache = null;
  stlCountyCache = null;
}

/**
 * Get detailed parcel metadata by ID with region-specific loading
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
    const region = determineRegionFromParcelId(parcelId);
    const parcel = await getParcelFromSpecificRegion(parcelId, region);

    if (parcel) {
      console.log(`📦 Found parcel metadata for ID: ${parcelId} in ${region}`);
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
    const cityIds = [];
    const countyIds = [];

    for (const id of parcelIds) {
      const region = determineRegionFromParcelId(id);
      if (region === 'stl_city') {
        cityIds.push(id);
      } else {
        countyIds.push(id);
      }
    }

    const results: ParcelMetadata[] = [];

    if (cityIds.length > 0) {
      const cityData = await loadRegionData('stl_city');
      for (const id of cityIds) {
        const parcel = cityData.get(id);
        if (parcel) {
          results.push(parcel);
        }
      }
    }

    if (countyIds.length > 0) {
      const countyData = await loadRegionData('stl_county');
      for (const id of countyIds) {
        const parcel = countyData.get(id);
        if (parcel) {
          results.push(parcel);
        }
      }
    }

    console.log(
      `📦 Found ${results.length}/${parcelIds.length} parcel records using region-specific loading`
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
