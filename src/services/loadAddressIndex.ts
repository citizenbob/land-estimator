import FlexSearch from 'flexsearch';
import { createUniversalBundleLoader } from '@lib/universalBundleLoader';
import { AppError, ErrorType } from '@lib/errorUtils';
import { decompressJsonData } from '@lib/universalLoader';

/**
 * Creates address lookup map for search result mapping
 * @param indexData Precomputed index data
 * @returns Map of parcel IDs to address strings
 */
async function createAddressLookupMap(
  indexData: FlexSearch.PrecomputedIndexData
): Promise<Record<string, string>> {
  const addressData: Record<string, string> = {};

  indexData.parcelIds.forEach((parcelId, idx) => {
    const searchString = indexData.searchStrings[idx];
    const address = searchString.replace(` ${parcelId}`, '');
    addressData[parcelId] = address;
  });

  return addressData;
}

/**
 * Creates a search index from precomputed search strings
 * @param indexData Precomputed index data
 * @returns FlexSearch index
 */
function createSearchIndex(
  indexData: FlexSearch.PrecomputedIndexData
): FlexSearch.Index {
  const searchIndex = new FlexSearch.Index({
    tokenize: 'forward',
    cache: 100,
    resolution: 3
  });

  indexData.searchStrings.forEach((searchString: string, idx: number) => {
    searchIndex.add(idx, searchString);
  });

  return searchIndex;
}

/**
 * Address index fallback - attempts to load from local backup if available
 * @throws When no fallback data is available
 */
async function loadRawAddressData(): Promise<
  FlexSearch.PrecomputedIndexData[]
> {
  // Try to load from emergency backup file if available
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/address-index-backup.json.gz');
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const decompressed =
          decompressJsonData<FlexSearch.PrecomputedIndexData>(
            new Uint8Array(arrayBuffer)
          );
        console.log('🚨 Using emergency backup address index');
        return [decompressed];
      }
    } catch (error) {
      console.warn('Emergency backup not available:', error);
    }
  }

  throw new AppError(
    'Address index requires optimized .gz data - no fallback available. CDN may be temporarily unavailable.',
    ErrorType.VALIDATION,
    { isRetryable: true }
  );
}

// Universal address index loader with versioning support
const addressIndexLoader = createUniversalBundleLoader<
  FlexSearch.PrecomputedIndexData,
  FlexSearch.PrecomputedIndexData,
  FlexSearch.FlexSearchIndexBundle
>({
  gzippedFilename: 'address-index.json.gz',
  baseFilename: 'address-index',
  useVersioning: process.env.NODE_ENV === 'production',
  createLookupMap: () => ({}),
  loadRawData: loadRawAddressData,
  extractDataFromIndex: (index: FlexSearch.PrecomputedIndexData) => [index],
  createBundle: async (data: FlexSearch.PrecomputedIndexData[]) => {
    const indexData = data[0];
    const searchIndex = createSearchIndex(indexData);
    const addressData = await createAddressLookupMap(indexData);

    return {
      index: searchIndex,
      parcelIds: indexData.parcelIds,
      addressData
    };
  }
});

/**
 * Universal address index loader that works in both browser and Node.js environments
 * @returns FlexSearch index bundle with search index, parcel IDs, and address data
 * @throws When index file cannot be loaded or processed
 */
export async function loadAddressIndex(): Promise<FlexSearch.FlexSearchIndexBundle> {
  return addressIndexLoader.loadBundle();
}

/**
 * Clears the cached address index bundle
 */
export function clearAddressIndexCache(): void {
  addressIndexLoader.clearCache();
}
