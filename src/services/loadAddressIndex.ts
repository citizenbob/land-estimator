/**
 * Address Index Loader - Static Implementation with CDN Fallback
 *
 * Primary: Static files in /public/search (instant loading)
 * Fallback: CDN delivery via versioned bundle loader
 */

import { Index } from 'flexsearch';
import { devLog, devWarn, logError } from '@lib/logger';
import type {
  FlexSearchIndexBundle,
  PrecomputedIndexData,
  StaticAddressManifest,
  AddressLookupData
} from '@app-types';

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
  devLog('⚡ Building FlexSearch index from CDN data');

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
  private warmupStarted: boolean = false;

  private constructor() {
    // Start warming up on server start (Node.js only)
    if (typeof window === 'undefined' && !this.warmupStarted) {
      this.warmupStarted = true;
      // Start warmup immediately and synchronously to avoid 504 timeouts
      this.warmupServerIndex().catch((error) => {
        devWarn('⚠️ Server index warmup failed:', error);
      });
    }
  }

  static getInstance(): StaticAddressIndexLoader {
    if (!StaticAddressIndexLoader.instance) {
      StaticAddressIndexLoader.instance = new StaticAddressIndexLoader();
    }
    return StaticAddressIndexLoader.instance;
  }

  /**
   * Load address index from static files with CDN fallback
   * Ensures the index is loaded before returning, blocking if necessary
   */
  async loadAddressIndex(): Promise<FlexSearchIndexBundle> {
    // If we already have the bundle, return it immediately
    if (this.bundle) {
      devLog('⚡ Using cached address index');
      return this.bundle;
    }

    // If we're already loading, wait for that to complete
    if (this.loadingPromise) {
      devLog('⏳ Waiting for existing load operation...');
      return this.loadingPromise;
    }

    // Start a new load operation
    devLog('🚀 Starting fresh address index load...');
    this.loadingPromise = this._loadFromStaticFiles();

    try {
      this.bundle = await this.loadingPromise;
      devLog('✅ Address index loaded and cached');
      return this.bundle;
    } finally {
      // Clear the loading promise whether successful or not
      this.loadingPromise = null;
    }
  }

  /**
   * Internal method to load from static files with fallback
   */
  private async _loadFromStaticFiles(): Promise<FlexSearchIndexBundle> {
    devLog('📥 Loading address index from static files...');

    try {
      const staticResult = await this._tryLoadFromStatic();
      if (staticResult) {
        return staticResult;
      }

      devLog('🌐 Static files unavailable, falling back to CDN...');
      return await this._loadFromCDN();
    } catch (error) {
      logError('❌ All loading methods failed:', error);
      throw new Error(`Address index loading failed: ${error}`);
    }
  }

  /**
   * Try to load from static files
   */
  private async _tryLoadFromStatic(): Promise<FlexSearchIndexBundle | null> {
    try {
      const isServer = typeof window === 'undefined';

      if (isServer) {
        devLog(
          '🖥️ Server-side detected, loading static files from filesystem...'
        );
        return await this._loadFromFileSystem();
      }

      const manifestResponse = await fetch('/search/latest.json');
      if (!manifestResponse.ok) {
        devLog('📭 Static manifest not found, will try CDN fallback');
        return null;
      }

      const manifest: StaticAddressManifest = await manifestResponse.json();
      devLog(
        `📊 Found static address index v${manifest.version} with ${manifest.recordCount} records`
      );

      const lookupFile = manifest.files.find((f) => f.includes('lookup'));
      if (!lookupFile) {
        devLog('📭 Static lookup file not found, will try CDN fallback');
        return null;
      }

      const lookupResponse = await fetch(`/search/${lookupFile}`);
      if (!lookupResponse.ok) {
        devLog('📭 Static lookup data unavailable, will try CDN fallback');
        return null;
      }

      const lookupData: AddressLookupData = await lookupResponse.json();

      const loadedFromExport = await this._tryLoadFromExportedFiles(
        manifest,
        lookupData
      );
      if (loadedFromExport) {
        devLog('✅ Loaded from static exported FlexSearch index');
        return loadedFromExport;
      }

      devLog('🔄 Rebuilding FlexSearch index from static search strings...');
      const rebuildStart = performance.now();

      const searchIndex = new Index(FLEXSEARCH_CONFIG);

      // Build index in chunks to prevent UI blocking
      await this._buildIndexInChunks(searchIndex, lookupData.searchStrings);

      const rebuildTime = performance.now() - rebuildStart;
      devLog(`⚡ Static address index rebuilt in ${rebuildTime.toFixed(2)}ms`);

      return {
        index: searchIndex,
        parcelIds: lookupData.parcelIds,
        addressData: lookupData.addressData
      };
    } catch (error) {
      devLog(`⚠️ Static loading failed: ${error}`);
      return null;
    }
  }

  /**
   * Load static files from filesystem (server-side only)
   */
  private async _loadFromFileSystem(): Promise<FlexSearchIndexBundle | null> {
    try {
      const { loadStaticFilesFromFileSystem } = await import(
        '@lib/fileSystemLoader'
      );

      const result = await loadStaticFilesFromFileSystem();
      if (!result) {
        return null;
      }

      const { manifest, lookupData } = result;

      const loadedFromExport = await this._tryLoadFromExportedFiles(
        manifest,
        lookupData
      );
      if (loadedFromExport) {
        devLog('✅ Loaded from static exported FlexSearch index (filesystem)');
        return loadedFromExport;
      }

      devLog(
        '🔄 Rebuilding FlexSearch index from static search strings (filesystem)...'
      );
      const rebuildStart = performance.now();

      const searchIndex = new Index(FLEXSEARCH_CONFIG);

      // Build index in chunks to prevent UI blocking
      await this._buildIndexInChunks(searchIndex, lookupData.searchStrings);

      const rebuildTime = performance.now() - rebuildStart;
      devLog(
        `⚡ Static address index rebuilt in ${rebuildTime.toFixed(2)}ms (filesystem)`
      );

      return {
        index: searchIndex,
        parcelIds: lookupData.parcelIds,
        addressData: lookupData.addressData
      };
    } catch (error) {
      devLog(`⚠️ Filesystem loading failed: ${error}`);
      return null;
    }
  }

  /**
   * Load from CDN as fallback
   */
  private async _loadFromCDN(): Promise<FlexSearchIndexBundle> {
    devLog('🌐 Loading address index from CDN fallback...');

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

      devLog('📡 Using CDN versioned bundle loader...');
      const result = await loadVersionedBundle(addressIndexConfig);
      devLog('✅ Successfully loaded from CDN fallback');
      return result;
    } catch (error) {
      logError('❌ CDN fallback also failed:', error);
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
      devLog('📤 Attempting to load from exported FlexSearch files...');

      const indexFiles = manifest.files.filter(
        (f) =>
          !f.includes('metadata') &&
          !f.includes('lookup') &&
          !f.includes('manifest') &&
          f.endsWith('.json')
      );

      if (indexFiles.length === 0) {
        devLog('📭 No exported index files found');
        return null;
      }

      devLog(`📥 Loading ${indexFiles.length} index files...`);

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
   * Warmup server index (background loading on server start)
   */
  private async warmupServerIndex(): Promise<void> {
    if (typeof window !== 'undefined') {
      return;
    }

    try {
      devLog('🔥 [Server Warmup] Pre-warming address index...');
      const startTime = performance.now();

      const bundle = await this.loadAddressIndex();

      const duration = performance.now() - startTime;
      const addressCount = bundle.parcelIds.length;

      devLog(
        `✅ [Server Warmup] Address index pre-warmed in ${duration.toFixed(2)}ms`
      );
      devLog(
        `📊 [Server Warmup] Ready to serve ${addressCount.toLocaleString()} addresses instantly`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      devWarn(
        `⚠️ [Server Warmup] Failed to pre-warm address index: ${errorMessage}`
      );
      devWarn(
        '📍 [Server Warmup] First search will experience cold-start delay'
      );
    }
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.bundle = null;
    this.loadingPromise = null;
    devLog('🗑️ Address index cache cleared');
  }

  /**
   * Build FlexSearch index in chunks to prevent UI blocking
   */
  private async _buildIndexInChunks(
    searchIndex: Index,
    searchStrings: string[]
  ): Promise<void> {
    // Process 1000 items at a time
    const CHUNK_SIZE = 1000;
    const totalItems = searchStrings.length;
    let processed = 0;

    // Only yield control in the browser, not on the server
    const shouldYield = typeof window !== 'undefined';

    for (let i = 0; i < totalItems; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE, totalItems);

      // Process this chunk
      for (let j = i; j < end; j++) {
        searchIndex.add(j, searchStrings[j]);
      }

      processed = end;

      // Show progress for large datasets
      if (processed % 50000 === 0 || processed === totalItems) {
        devLog(
          `📊 Index building progress: ${processed.toLocaleString()}/${totalItems.toLocaleString()} (${Math.round(
            (processed / totalItems) * 100
          )}%)`
        );
      }

      // Yield control to the main thread in the browser
      if (shouldYield && i + CHUNK_SIZE < totalItems) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
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
  } catch (error) {
    console.debug('Failed to clear cache:', error);
  }
}
