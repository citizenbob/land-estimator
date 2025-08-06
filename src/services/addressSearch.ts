import type { FlexSearchIndexBundle } from 'flexsearch';
import { loadAddressIndexProgressive } from '@services/loadAddressIndex';
import { logError } from '@lib/errorUtils';
import {
  FLEXSEARCH_SEARCH_OPTIONS,
  DEFAULT_SEARCH_LIMIT
} from '@config/flexsearch';
import { extractRegion, normalizeQuery } from '@lib/addressTransforms';
import type { AddressLookupRecord } from '@app-types/localAddressTypes';

let addressSearchBundle: FlexSearchIndexBundle | null = null;

export function resetAddressSearchCache(): void {
  addressSearchBundle = null;
}

function formatSearchResults(
  searchResults: string[],
  bundle: FlexSearchIndexBundle,
  limit: number
): AddressLookupRecord[] {
  return searchResults.slice(0, limit).map((docId) => {
    const parcelId = docId;
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
 * Client-Only Address Search with Static FlexSearch Index
 *
 * Following canonical instructions:
 * - Load static index once on first search
 * - Pure client-side operation (no API calls)
 * - Instant typeahead results
 * - Zero rebuilds at runtime
 *
 * @param query - Search query string (minimum 2 characters)
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Promise<AddressLookupRecord[]> - Array of matching address records
 */
export async function searchAddresses(
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT
): Promise<AddressLookupRecord[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    if (!addressSearchBundle) {
      console.log('🔍 Loading static FlexSearch index...');
      const loadStart = performance.now();

      addressSearchBundle = await loadAddressIndexProgressive();

      const loadTime = performance.now() - loadStart;
      console.log(`✅ Static index loaded in ${loadTime.toFixed(2)}ms`);
      console.log(
        `📊 Ready to search ${addressSearchBundle.parcelIds.length.toLocaleString()} addresses`
      );
    }

    console.log('⚡ Performing instant client-side search');
    const searchStart = performance.now();

    const normalizedQuery = normalizeQuery(query);
    const searchResults = addressSearchBundle.index.search(normalizedQuery, {
      ...FLEXSEARCH_SEARCH_OPTIONS,
      limit
    }) as unknown as string[];

    const searchTime = performance.now() - searchStart;
    console.log(
      `🔍 Found ${searchResults.length} results in ${searchTime.toFixed(2)}ms`
    );

    return formatSearchResults(searchResults, addressSearchBundle, limit);
  } catch (error) {
    logError(error, {
      operation: 'client_address_search',
      query,
      limit
    });

    console.error('❌ Client-side address search failed:', error);
    return [];
  }
}
