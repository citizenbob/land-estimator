const NOMINATIM_BASE_URL =
  process.env.NOMINATIM_BASE_URL ||
  'https://nominatim.openstreetmap.org/search';

import { NominatimResponse, AddressSuggestion } from '@typez/addressMatchTypes';

function buildNominatimUrl(query: string, limit: number): URL {
  const url = new URL(NOMINATIM_BASE_URL);
  url.searchParams.append('q', query);
  url.searchParams.append('format', 'json');
  url.searchParams.append('addressDetails', '1');
  url.searchParams.append('limit', limit.toString());
  return url;
}

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

// Return only the essential suggestion info
export async function getNominatimSuggestions(
  query: string
): Promise<AddressSuggestion[]> {
  try {
    const url = buildNominatimUrl(query, 5);
    const data = await fetchNominatimResponse(url);
    return data.map((item: NominatimResponse) => ({
      place_id: item.place_id,
      display_name: item.display_name
    }));
  } catch (error) {
    console.error(`Error fetching address suggestions for "${query}":`, error);
    return [];
  }
}
