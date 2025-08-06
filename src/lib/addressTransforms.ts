import type { AddressLookupRecord } from '@app-types/localAddressTypes';
import type { ParcelMetadata } from '@app-types/parcel-index';

export const simplifyAddressRecord = (item: AddressLookupRecord) => ({
  place_id: item.id,
  display_name: item.display_name
});

export const enrichAddressData = (
  item: AddressLookupRecord,
  metadata?: ParcelMetadata
) => ({
  ...item,
  region: extractRegion(item.display_name),
  normalized: normalizeQuery(item.display_name),
  ...metadata
});

export const extractRegion = (displayName: string): string => {
  const regionMatch = displayName.match(/, ([^,]+), MO/);
  return regionMatch ? regionMatch[1] : 'Missouri';
};

export const normalizeQuery = (query: string): string =>
  query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const createAddressRecord = (
  id: string,
  displayName: string
): AddressLookupRecord => ({
  id,
  display_name: displayName,
  region: extractRegion(displayName),
  normalized: normalizeQuery(displayName)
});

export const transformToSuggestions = (results: AddressLookupRecord[]) =>
  results.map(simplifyAddressRecord);

export const filterExactMatches = <T extends { display_name: string }>(
  suggestions: T[],
  query: string
): T[] => {
  const normalizedQuery = normalizeQuery(query);
  return suggestions.filter(
    (suggestion) => normalizeQuery(suggestion.display_name) !== normalizedQuery
  );
};
