import FlexSearch from 'flexsearch';
import { createVersionedBundleLoader } from '@lib/versionedBundleLoader';
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

// Versioned address index loader with comprehensive CDN fallback chain
const addressIndexLoader = createVersionedBundleLoader<
  FlexSearch.PrecomputedIndexData,
  FlexSearch.PrecomputedIndexData,
  FlexSearch.FlexSearchIndexBundle
>({
  baseFilename: 'address-index',
  createLookupMap: () => ({}),
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
 * Enhanced with Service Worker integration for better caching
 * @returns FlexSearch index bundle with search index, parcel IDs, and address data
 * @throws When index file cannot be loaded or processed
 */
export async function loadAddressIndex(): Promise<FlexSearch.FlexSearchIndexBundle> {
  // In production, use versioned loader with comprehensive CDN fallback chain
  if (process.env.NODE_ENV === 'production') {
    // Check if Service Worker has the data cached
    if (typeof window !== 'undefined') {
      try {
        const { default: serviceWorkerClient } = await import(
          '@lib/serviceWorkerClient'
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

        // Warm up cache if needed
        await serviceWorkerClient.warmupCache();
      } catch (error) {
        console.warn(
          '[Address Index] Service Worker integration failed:',
          error
        );
        // Continue with normal loading
      }
    }

    return addressIndexLoader.loadBundle();
  }

  // Test environment - use mocked loader
  if (process.env.NODE_ENV === 'test') {
    // During tests, the loader should be mocked, so this should work
    return addressIndexLoader.loadBundle();
  }

  // Development mode - graceful fallback to raw data
  console.warn(
    '⚠️ [DEV] Loading raw address data (versioned loader disabled in development)'
  );
  try {
    const rawDataArray = await loadRawAddressData();
    // Extract the single PrecomputedIndexData object
    const rawData = rawDataArray[0];
    const searchIndex = createSearchIndex(rawData);
    const addressData = await createAddressLookupMap(rawData);

    return {
      index: searchIndex,
      parcelIds: rawData.parcelIds,
      addressData
    };
  } catch (error) {
    console.error('[DEV] Failed to load raw address data:', error);
    throw new AppError(
      'Address data not available in development mode. Ensure data files are present.',
      ErrorType.VALIDATION,
      { isRetryable: false }
    );
  }
}

/**
 * Clears the cached address index bundle
 */
export function clearAddressIndexCache(): void {
  addressIndexLoader.clearCache();
}
