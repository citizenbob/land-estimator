/**
 * Address data transformation utilities
 */

import type { AddressLookupRecord } from '@services/addressSearch';
import type { ParcelMetadata } from '@services/parcelMetadata';

/**
 * Simplifies an address record for use in suggestions
 */
export const simplifyAddressRecord = (item: AddressLookupRecord) => ({
  place_id: item.id,
  display_name: item.display_name
});

/**
 * Enriches address data with region and normalized display name
 */
export const enrichAddressData = (
  item: AddressLookupRecord,
  metadata?: ParcelMetadata
) => ({
  ...item,
  region: extractRegion(item.display_name),
  normalized: normalizeQuery(item.display_name),
  ...metadata
});

/**
 * Extracts region from address display name (Missouri-specific patterns)
 */
export const extractRegion = (displayName: string): string => {
  const regionMatch = displayName.match(/, ([^,]+), MO/);
  return regionMatch ? regionMatch[1] : 'Missouri';
};

/**
 * Normalizes search query for optimal FlexSearch results
 */
export const normalizeQuery = (query: string): string =>
  query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Creates an address lookup record from basic data
 */
export const createAddressRecord = (
  id: string,
  displayName: string
): AddressLookupRecord => ({
  id,
  display_name: displayName,
  region: extractRegion(displayName),
  normalized: normalizeQuery(displayName)
});

/**
 * Transforms search results into simplified suggestion format
 */
export const transformToSuggestions = (results: AddressLookupRecord[]) =>
  results.map(simplifyAddressRecord);

/**
 * Filters out suggestions that match the current query exactly
 */
export const filterExactMatches = <T extends { display_name: string }>(
  suggestions: T[],
  query: string
): T[] => {
  const normalizedQuery = normalizeQuery(query);
  return suggestions.filter(
    (suggestion) => normalizeQuery(suggestion.display_name) !== normalizedQuery
  );
};
