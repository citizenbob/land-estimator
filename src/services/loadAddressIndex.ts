import FlexSearch from 'flexsearch';
import { createUniversalBundleLoader } from '@lib/universalBundleLoader';
import type { NodeModules } from '@lib/universalLoader';

/**
 * Creates address lookup map for search result mapping
 * @param indexData Precomputed index data
 * @returns Map of parcel IDs to address strings
 */
async function createAddressLookupMap(
  indexData: FlexSearch.PrecomputedIndexData
): Promise<Record<string, string>> {
  const addressData: Record<string, string> = {};

  try {
    const addressIndexModule = await import('@data/address_index.json');
    Object.assign(addressData, addressIndexModule.default);
  } catch {
    indexData.parcelIds.forEach((parcelId, idx) => {
      const searchString = indexData.searchStrings[idx];
      const address = searchString.replace(` ${parcelId}`, '');
      addressData[parcelId] = address;
    });
  }

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
 * Address index requires optimized data - no raw fallback available
 * @throws Always throws as raw fallback is not supported
 */
async function loadRawAddressData(): Promise<
  FlexSearch.PrecomputedIndexData[]
> {
  throw new Error(
    'Address index requires optimized .gz data - no raw fallback available'
  );
}

const addressIndexLoader = createUniversalBundleLoader<
  FlexSearch.PrecomputedIndexData,
  FlexSearch.PrecomputedIndexData,
  FlexSearch.FlexSearchIndexBundle
>({
  gzippedFilename: 'address-index.json.gz',
  createLookupMap: () => ({}),
  loadRawData: loadRawAddressData,
  extractDataFromIndex: (index) => [index],
  createBundle: async (data) => {
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
 * Sets mock Node.js modules for testing
 */
export function _setTestMockNodeModules(mockModules: NodeModules | null): void {
  addressIndexLoader.setTestMockModules(mockModules);
}

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
