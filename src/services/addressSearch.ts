/**
 * Client-Only Address Search - Static FlexSearch Implementation
 *
 * Following canonical instructions:
 * - Load static FlexSearch index once
 * - Pure client-side typeahead search
 * - Zero runtime rebuilds, instant results
 * - No SSR complexity
 *
 * See refactor.instructions.md for pipeline rules
 */

import {
  loadAddressIndex,
  type FlexSearchIndexBundle
} from '@services/loadAddressIndex';
import { logError } from '@lib/errorUtils';

export interface AddressLookupRecord {
  id: string;
  display_name: string;
  region: string;
  normalized: string;
}

// Global cache for client-only operation
let addressSearchBundle: FlexSearchIndexBundle | null = null;

/**
 * Reset cached search bundle (for testing)
 */
export function resetAddressSearchCache(): void {
  addressSearchBundle = null;
}

/**
 * Normalize search query for optimal FlexSearch results
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract region from address (Missouri-specific patterns)
 */
function extractRegion(displayName: string): string {
  const regionMatch = displayName.match(/, ([^,]+), MO/);
  return regionMatch ? regionMatch[1] : 'Missouri';
}

/**
 * Convert FlexSearch results to standardized address records
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
  limit: number = 10
): Promise<AddressLookupRecord[]> {
  // Quick validation
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    // Load static index on first search (cached thereafter)
    if (!addressSearchBundle) {
      console.log('🔍 Loading static FlexSearch index...');
      const loadStart = performance.now();

      addressSearchBundle = await loadAddressIndex();

      const loadTime = performance.now() - loadStart;
      console.log(`✅ Static index loaded in ${loadTime.toFixed(2)}ms`);
      console.log(
        `📊 Ready to search ${addressSearchBundle.parcelIds.length.toLocaleString()} addresses`
      );
    }

    // Perform instant client-side search
    console.log('⚡ Performing instant client-side search');
    const searchStart = performance.now();

    const normalizedQuery = normalizeQuery(query);
    const searchResults = addressSearchBundle.index.search(normalizedQuery, {
      bool: 'and',
      limit
    }) as number[];

    const searchTime = performance.now() - searchStart;
    console.log(
      `� Found ${searchResults.length} results in ${searchTime.toFixed(2)}ms`
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
