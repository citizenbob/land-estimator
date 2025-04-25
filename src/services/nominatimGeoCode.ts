const NOMINATIM_BASE_URL =
  process.env.NOMINATIM_BASE_URL ||
  'https://nominatim.openstreetmap.org/search';

import { NominatimResponse, AddressSuggestion } from '@typez/addressMatchTypes';

/**
 * Constructs a URL for the Nominatim API with appropriate query parameters
 *
 * @param query - The search query or address string to look up
 * @param limit - Maximum number of results to request
 * @returns URL object configured for the Nominatim API request
 */
function buildNominatimUrl(query: string, limit: number): URL {
  const url = new URL(NOMINATIM_BASE_URL);
  url.searchParams.append('q', query);
  url.searchParams.append('format', 'json');
  url.searchParams.append('addressDetails', '1');
  url.searchParams.append('limit', limit.toString());
  return url;
}

/**
 * Fetches and validates response data from the Nominatim API
 * 
 * @param url - URL object configured for the Nominatim API request
 * @returns Promise resolving to array of NominatimResponse objects
 * @throws Error when API request fails or response format is invalid
 */
async function fetchNominatimResponse(url: URL): Promise<NominatimResponse[]> {
  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'land-estimator-app' }
  });
  if (!response.ok) {
    throw new Error(
      `Nominatim API error: ${response.status} ${response.statusText}`
    );
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid response format');
  }
  return data;
}

/**
 * Gets geocoding information for a specific address
 * 
 * @param address - The full address to look up
 * @returns Promise resolving to an AddressSuggestion object or null if not found
 */
export async function getCoordinatesFromAddress(
  address: string
): Promise<AddressSuggestion | null> {
  try {
    const url = buildNominatimUrl(address, 1);
    const data = await fetchNominatimResponse(url);
    if (data.length === 0) {
      console.warn(`No results found for: ${address}`);
      return null;
    }
    const result = data[0];

    const place_id = result.place_id;
    const display_name = result.display_name;

    if (!place_id || !display_name) {
      console.warn(`Incomplete data for address: ${address}`);
      return null;
    }
    return {
      place_id,
      display_name
    };
  } catch (error) {
    console.error(`Error fetching coordinates for "${address}":`, error);
    return null;
  }
}

/**
 * Retrieves address suggestions based on a partial query string
 *
 * @param query - The partial address or location search term
 * @returns Promise resolving to array of NominatimResponse objects
 */
export async function getNominatimSuggestions(
  query: string
): Promise<NominatimResponse[]> {
  try {
    const url = buildNominatimUrl(query, 5);
    const data = await fetchNominatimResponse(url);
    return data;
  } catch (error) {
    console.error(`Error fetching address suggestions for "${query}":`, error);
    return [];
  }
}
