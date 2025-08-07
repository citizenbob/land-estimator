import {
  AddressSuggestion,
  EnrichedAddressSuggestion
} from '@app-types/localAddressTypes';

interface ParcelData {
  latitude?: number;
  longitude?: number;
  region?: string;
  calc?: {
    landarea?: number;
    building_sqft?: number;
    estimated_landscapable_area?: number;
    property_type?: string;
  };
  affluence_score?: number;
}

interface RawAddressData {
  latitude: number;
  longitude: number;
  region: string;
  calc: {
    landarea: number;
    building_sqft: number;
    estimated_landscapable_area: number;
    property_type: string;
  };
  affluence_score: number;
}

/**
 * Transforms raw parcel data or address data into an EnrichedAddressSuggestion
 */
export function createEnrichedAddressSuggestion(
  suggestion: AddressSuggestion,
  data: ParcelData | RawAddressData
): EnrichedAddressSuggestion {
  return {
    place_id: suggestion.place_id,
    display_name: suggestion.display_name,
    latitude: data.latitude || 0,
    longitude: data.longitude || 0,
    region: data.region || 'Unknown',
    calc: {
      landarea: data.calc?.landarea || 0,
      building_sqft: data.calc?.building_sqft || 0,
      estimated_landscapable_area: data.calc?.estimated_landscapable_area || 0,
      property_type: data.calc?.property_type || 'residential'
    },
    affluence_score: data.affluence_score || 0
  };
}

/**
 * Fetches parcel metadata from API
 */
export async function fetchParcelMetadata(
  placeId: string
): Promise<ParcelData | null> {
  try {
    const response = await fetch(`/api/parcel-metadata/${placeId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch parcel data: ${response.status}`);
    }

    const rawData = await response.json();
    return rawData?.data || null;
  } catch (error) {
    console.error('Error fetching parcel metadata:', error);
    return null;
  }
}
