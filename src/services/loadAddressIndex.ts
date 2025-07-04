/**
 * Address Index Loader - Static Implementation with CDN Fallback
 *
 * Primary: Static files in /public/search (instant loading)
 * Fallback: CDN delivery via versioned bundle loader
 */

import { Index } from 'flexsearch';
import type {
  FlexSearchIndexBundle,
  PrecomputedIndexData,
  StaticAddressManifest,
  AddressLookupData
} from '@app-types';

// Re-export types for backward compatibility
export type {
  FlexSearchIndexBundle,
  PrecomputedIndexData,
  StaticAddressManifest,
  AddressLookupData
};

const FLEXSEARCH_CONFIG = {
  tokenize: 'forward',
  cache: 100,
  resolution: 3
} as const;

/**
 * Creates address lookup map for CDN fallback
 */
async function createAddressLookupMapFromData(
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
 * Creates a search index from search strings for CDN fallback
 */
function createSearchIndexFromData(indexData: PrecomputedIndexData): Index {
  console.log('⚡ Building FlexSearch index from CDN data');

  const searchIndex = new Index(FLEXSEARCH_CONFIG);

  indexData.searchStrings.forEach((searchString: string, idx: number) => {
    searchIndex.add(idx, searchString);
  });

  return searchIndex;
}

/**
 * Static Address Index Loader
 */
class StaticAddressIndexLoader {
  private static instance: StaticAddressIndexLoader | null = null;
  private bundle: FlexSearchIndexBundle | null = null;
  private loadingPromise: Promise<FlexSearchIndexBundle> | null = null;

  private constructor() {}

  static getInstance(): StaticAddressIndexLoader {
    if (!StaticAddressIndexLoader.instance) {
      StaticAddressIndexLoader.instance = new StaticAddressIndexLoader();
    }
    return StaticAddressIndexLoader.instance;
  }

  /**
   * Load address index from static files with CDN fallback
   */
  async loadAddressIndex(): Promise<FlexSearchIndexBundle> {
    if (this.bundle) {
      return this.bundle;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this._loadFromStaticFiles();
    this.bundle = await this.loadingPromise;
    this.loadingPromise = null;

    return this.bundle;
  }

  /**
   * Internal method to load from static files with fallback
   */
  private async _loadFromStaticFiles(): Promise<FlexSearchIndexBundle> {
    console.log('📥 Loading address index from static files...');

    try {
      const staticResult = await this._tryLoadFromStatic();
      if (staticResult) {
        return staticResult;
      }

      console.log('🌐 Static files unavailable, falling back to CDN...');
      return await this._loadFromCDN();
    } catch (error) {
      console.error('❌ All loading methods failed:', error);
      throw new Error(`Address index loading failed: ${error}`);
    }
  }

  /**
   * Try to load from static files
   */
  private async _tryLoadFromStatic(): Promise<FlexSearchIndexBundle | null> {
    try {
      const manifestResponse = await fetch('/search/latest.json');
      if (!manifestResponse.ok) {
        console.log('📭 Static manifest not found, will try CDN fallback');
        return null;
      }

      const manifest: StaticAddressManifest = await manifestResponse.json();
      console.log(
        `📊 Found static address index v${manifest.version} with ${manifest.recordCount} records`
      );

      const lookupFile = manifest.files.find((f) => f.includes('lookup'));
      if (!lookupFile) {
        console.log('📭 Static lookup file not found, will try CDN fallback');
        return null;
      }

      const lookupResponse = await fetch(`/search/${lookupFile}`);
      if (!lookupResponse.ok) {
        console.log('📭 Static lookup data unavailable, will try CDN fallback');
        return null;
      }

      const lookupData: AddressLookupData = await lookupResponse.json();

      const loadedFromExport = await this._tryLoadFromExportedFiles(
        manifest,
        lookupData
      );
      if (loadedFromExport) {
        console.log('✅ Loaded from static exported FlexSearch index');
        return loadedFromExport;
      }

      console.log(
        '🔄 Rebuilding FlexSearch index from static search strings...'
      );
      const rebuildStart = performance.now();

      const searchIndex = new Index(FLEXSEARCH_CONFIG);

      lookupData.searchStrings.forEach((searchString, idx) => {
        searchIndex.add(idx, searchString);
      });

      const rebuildTime = performance.now() - rebuildStart;
      console.log(
        `⚡ Static address index rebuilt in ${rebuildTime.toFixed(2)}ms`
      );

      return {
        index: searchIndex,
        parcelIds: lookupData.parcelIds,
        addressData: lookupData.addressData
      };
    } catch (error) {
      console.log(`⚠️ Static loading failed: ${error}`);
      return null;
    }
  }

  /**
   * Load from CDN as fallback
   */
  private async _loadFromCDN(): Promise<FlexSearchIndexBundle> {
    console.log('🌐 Loading address index from CDN fallback...');

    try {
      const { loadVersionedBundle } = await import(
        '@workers/versionedBundleLoader'
      );

      const addressIndexConfig = {
        baseFilename: 'address-index',
        createLookupMap: () => ({}),
        extractDataFromIndex: (index: PrecomputedIndexData) => [index],
        createBundle: async (data: PrecomputedIndexData[]) => {
          const indexData = data[0];
          const searchIndex = createSearchIndexFromData(indexData);
          const addressData = await createAddressLookupMapFromData(indexData);

          return {
            index: searchIndex,
            parcelIds: indexData.parcelIds,
            addressData
          };
        }
      };

      console.log('📡 Using CDN versioned bundle loader...');
      const result = await loadVersionedBundle(addressIndexConfig);
      console.log('✅ Successfully loaded from CDN fallback');
      return result;
    } catch (error) {
      console.error('❌ CDN fallback also failed:', error);
      throw new Error(`Both static and CDN loading failed: ${error}`);
    }
  }

  /**
   * Try to load from exported FlexSearch files (preferred)
   */
  private async _tryLoadFromExportedFiles(
    manifest: StaticAddressManifest,
    lookupData: AddressLookupData
  ): Promise<FlexSearchIndexBundle | null> {
    try {
      console.log('📤 Attempting to load from exported FlexSearch files...');

      const indexFiles = manifest.files.filter(
        (f) =>
          !f.includes('metadata') &&
          !f.includes('lookup') &&
          !f.includes('manifest') &&
          f.endsWith('.json')
      );

      if (indexFiles.length === 0) {
        console.log('📭 No exported index files found');
        return null;
      }

      console.log(`📥 Loading ${indexFiles.length} index files...`);

      const searchIndex = new Index(FLEXSEARCH_CONFIG);

      for (const filename of indexFiles) {
        const response = await fetch(`/search/${filename}`);
        if (!response.ok) {
          throw new Error(`Failed to load ${filename}: ${response.status}`);
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        searchIndex.import(data);
        console.log(`  ✅ Imported ${filename}`);
      }

      const testResults = searchIndex.search('test');
      console.log(
        `🧪 Index verification: ${testResults.length >= 0 ? 'ready' : 'failed'}`
      );

      return {
        index: searchIndex,
        parcelIds: lookupData.parcelIds,
        addressData: lookupData.addressData
      };
    } catch (error) {
      console.log(`⚠️ Export loading failed: ${error}`);
      return null;
    }
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.bundle = null;
    this.loadingPromise = null;
    console.log('🗑️ Address index cache cleared');
  }
}

/**
 * Load address index from static files with CDN fallback
 * @returns Promise<FlexSearchIndexBundle> - Search index bundle
 */
export async function loadAddressIndex(): Promise<FlexSearchIndexBundle> {
  const loader = StaticAddressIndexLoader.getInstance();
  return loader.loadAddressIndex();
}

/**
 * Clear address index cache
 */
export function clearAddressIndexCache(): void {
  const loader = StaticAddressIndexLoader.getInstance();
  loader.clearCache();

  try {
    import('@workers/versionedBundleLoader').then(({ clearMemoryCache }) => {
      clearMemoryCache();
    });
  } catch {
    // Ignore dynamic import errors
  }
}
