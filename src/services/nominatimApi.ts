import { NominatimResponse } from '@typez/addressMatchTypes';

/**
 * API client for interacting with the Nominatim service
 */
export class NominatimApiClient {
  /**
   * Fetches address suggestions from the Nominatim API
   * @param query The search query string
   * @returns Promise with suggestion data
   * @throws Error if the request fails
   */
  static async fetchSuggestions(query: string): Promise<NominatimResponse[]> {
    const url = `/api/nominatim?type=suggestions&query=${encodeURIComponent(query)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch suggestions');
    }

    return response.json();
  }

  /**
   * Fetches coordinates for a specific address
   * @param address The full address to look up
   * @returns Promise with location data
   * @throws Error if the request fails
   */
  static async fetchCoordinates(address: string): Promise<NominatimResponse> {
    const url = `/api/nominatim?type=coordinates&address=${encodeURIComponent(address)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch coordinates');
    }

    return response.json();
  }
}
