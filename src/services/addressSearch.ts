import { loadAddressIndex } from '@services/loadAddressIndex';
import { createNetworkError, logError } from '@lib/errorUtils';
import type { FlexSearchIndexBundle } from '@app-types';

export interface AddressLookupRecord {
  id: string;
  display_name: string;
  region: string;
  normalized: string;
}

let addressSearchBundle: FlexSearchIndexBundle | null = null;

/**
 * Resets the cached address search bundle (for testing purposes)
 */
export function resetAddressSearchCache(): void {
  addressSearchBundle = null;
}

/**
 * Normalizes search query by removing punctuation and converting to lowercase.
 * @param {string} query - Raw search query
 * @returns {string} Normalized query string
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts region from display name using common Missouri patterns.
 * @param {string} displayName - Full address display name
 * @returns {string} Extracted region or 'Unknown'
 */
function extractRegion(displayName: string): string {
  const regionMatch = displayName.match(/, ([^,]+), MO/);
  return regionMatch ? regionMatch[1] : 'Unknown';
}

/**
 * Converts search results to standardized address lookup records.
 * @param {number[]} searchResults - Array of search result indices
 * @param {FlexSearchIndexBundle} bundle - Search bundle with lookup data
 * @param {number} limit - Maximum number of results to return
 * @returns {AddressLookupRecord[]} Array of formatted address records
 */
function formatSearchResults(
  searchResults: number[],
  bundle: FlexSearchIndexBundle,
  limit: number
): AddressLookupRecord[] {
  return searchResults.slice(0, limit).map((index) => {
    const parcelId = bundle.parcelIds[index];
    const displayName = bundle.addressData[parcelId] || 'Unknown Address';
    const region = extractRegion(displayName);
    const normalized = normalizeQuery(displayName);

    return {
      id: parcelId,
      display_name: displayName,
      region,
      normalized
    };
  });
}

/**
 * Searches addresses using precomputed search index.
 * In browser: Calls /api/lookup endpoint
 * On server: Uses in-memory search index
 *
 * @param {string} query - Search query string (minimum 2 characters)
 * @param {number} [limit=10] - Maximum number of results to return
 * @returns {Promise<AddressLookupRecord[]>} Array of matching address records
 */
export async function searchAddresses(
  query: string,
  limit: number = 10
): Promise<AddressLookupRecord[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    // Always try to use local index first (both browser and server)
    if (!addressSearchBundle) {
      console.log('🔍 Loading address index for local search...');
      addressSearchBundle = await loadAddressIndex();
    }

    // If we have a local index, use it directly
    if (addressSearchBundle) {
      console.log('⚡ Using local FlexSearch index for instant search');
      const normalizedQuery = normalizeQuery(query);
      const searchResults = addressSearchBundle.index.search(normalizedQuery, {
        bool: 'and',
        limit
      }) as number[];

      return formatSearchResults(searchResults, addressSearchBundle, limit);
    }

    // Fallback to API only if local index failed to load
    if (typeof window !== 'undefined') {
      console.log('🌐 Falling back to API lookup...');
      const response = await fetch(
        `/api/lookup?query=${encodeURIComponent(query.trim())}`
      );
      if (!response.ok) {
        throw createNetworkError(
          `Failed to fetch address suggestions: ${response.status} ${response.statusText}`,
          { status: response.status, statusText: response.statusText }
        );
      }
      const { results } = await response.json();
      return results;
    }

    throw new Error(
      'Failed to load address search bundle - no fallback available'
    );
  } catch (error) {
    logError(error, {
      operation: 'address_search',
      query,
      limit
    });
    return [];
  }
}
