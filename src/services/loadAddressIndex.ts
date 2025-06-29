import FlexSearch from 'flexsearch';
import {
  loadVersionedBundle,
  clearMemoryCache
} from '@workers/versionedBundleLoader';

type PrecomputedIndexData = {
  parcelIds: string[];
  searchStrings: string[];
  timestamp: string;
  recordCount: number;
  version: string;
  exportMethod: string;
};

type FlexSearchIndexBundle = {
  index: FlexSearch.Index;
  parcelIds: string[];
  addressData: Record<string, string>;
};

/**
 * Creates address lookup map for search result mapping
 * @param indexData Precomputed index data
 * @returns Map of parcel IDs to address strings
 */
async function createAddressLookupMap(
  indexData: PrecomputedIndexData
): Promise<Record<string, string>> {
  const addressData: Record<string, string> = {};

  indexData.parcelIds.forEach((parcelId: string, idx: number) => {
    const searchString = indexData.searchStrings[idx];
    const address = searchString.replace(` ${parcelId}`, '');
    addressData[parcelId] = address;
  });

  return addressData;
}

/**
 * Creates a search index from search strings using fast rebuild approach
 * Based on performance testing: rebuild is faster and more reliable than export/import
 * @param indexData Precomputed index data
 * @returns FlexSearch index
 */
function createSearchIndex(indexData: PrecomputedIndexData): FlexSearch.Index {
  console.log('⚡ Building FlexSearch index from search strings');

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

const addressIndexConfig = {
  baseFilename: 'address-index',
  createLookupMap: () => ({}),
  extractDataFromIndex: (index: PrecomputedIndexData) => [index],
  createBundle: async (data: PrecomputedIndexData[]) => {
    const indexData = data[0];
    const searchIndex = createSearchIndex(indexData);
    const addressData = await createAddressLookupMap(indexData);

    return {
      index: searchIndex,
      parcelIds: indexData.parcelIds,
      addressData
    };
  }
};

/**
 * Universal address index loader that works in both browser and Node.js environments
 * Enhanced with Service Worker integration for better caching
 * @returns FlexSearch index bundle with search index, parcel IDs, and address data
 * @throws When index file cannot be loaded or processed
 */
export async function loadAddressIndex(): Promise<FlexSearchIndexBundle> {
  if (process.env.NODE_ENV === 'production') {
    if (typeof window !== 'undefined') {
      try {
        const { default: serviceWorkerClient } = await import(
          '@workers/serviceWorkerClient'
        );

        const { getVersionManifest } = await import(
          '@services/versionManifest'
        );
        const manifest = await getVersionManifest();
        const url = manifest.current.files.address_index;

        if (url && (await serviceWorkerClient.isCached(url))) {
          console.log(
            '🎯 [SW] Address index available in Service Worker cache'
          );
        }

        await serviceWorkerClient.warmupCache();
      } catch (error) {
        console.warn(
          '[Address Index] Service Worker integration failed:',
          error
        );
      }
    }

    return loadVersionedBundle(addressIndexConfig);
  }

  if (process.env.NODE_ENV === 'test') {
    return loadVersionedBundle(addressIndexConfig);
  }

  console.log('🔧 [DEV] Using versioned loader with Firebase CDN');
  return loadVersionedBundle(addressIndexConfig);
}

export function clearAddressIndexCache(): void {
  clearMemoryCache();
}
