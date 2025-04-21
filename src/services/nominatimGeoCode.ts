const NOMINATIM_BASE_URL =
  process.env.NOMINATIM_BASE_URL ||
  'https://nominatim.openstreetmap.org/search';

import { NominatimResponse, GeocodeResult } from '@typez/addressMatchTypes';

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
): Promise<GeocodeResult | null> {
  try {
    const url = buildNominatimUrl(address, 1);
    const data = await fetchNominatimResponse(url);
    if (data.length === 0) {
      console.warn(`No results found for: ${address}`);
      return null;
    }
    const result = data[0];

    const lat = result.lat;
    const lon = result.lon;
    const displayName = result.display_name;

    if (!lat || !lon || !displayName) {
      console.warn(`Incomplete data for address: ${address}`);
      return null;
    }
    return {
      lat,
      lon,
      displayName,
      label: displayName,
      value: `${lat},${lon}`
    };
  } catch (error) {
    console.error(`Error fetching coordinates for "${address}":`, error);
    return null;
  }
}

export async function getNominatimSuggestions(
  query: string
): Promise<GeocodeResult[]> {
  try {
    const url = buildNominatimUrl(query, 5);
    const data = await fetchNominatimResponse(url);

    return data.map((item: NominatimResponse) => ({
      displayName: item.display_name,
      label: item.display_name,
      lat: item.lat,
      lon: item.lon,
      value: item.display_name
    }));
  } catch (error) {
    console.error(`Error fetching address suggestions for "${query}":`, error);
    return [];
  }
}
