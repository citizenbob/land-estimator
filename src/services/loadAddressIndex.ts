/**
 * Static FlexSearch Index Loader - Regional Shard + Fast Rebuild Strategy
 *
 * Works with Vercel Edge Middleware:
 * - Detects user's region shard via cookie (set by middleware)
 * - Loads only that region's index files + lookup table
 * - Rebuilds index once on first use, then caches forever
 * - Client-only operation (no SSR)
 */

import { Index } from 'flexsearch';
import { devLog, logError } from '@lib/logger';

// Types
export interface FlexSearchIndexBundle {
  index: Index;
  parcelIds: string[];
  addressData: Record<string, string>;
}

export interface ShardManifest {
  version: string;
  buildTime: string;
  regions: Record<
    string,
    {
      region: string;
      version: string;
      hash: string;
      files: string[];
      lookup: string;
      addressCount: number;
      buildTime: string;
    }
  >;
  totalAddresses: number;
}

export interface AddressLookupData {
  parcelIds: string[];
  addressData: Record<string, string>;
}

// Should match your build config
const FLEXSEARCH_CONFIG = {
  tokenize: 'forward',
  cache: 100,
  resolution: 3,
  threshold: 1,
  depth: 2,
  bidirectional: true,
  suggest: true
} as const;

class ClientOnlyAddressIndexLoader {
  private static instance: ClientOnlyAddressIndexLoader | null = null;
  private bundle: FlexSearchIndexBundle | null = null;
  private loadingPromise: Promise<FlexSearchIndexBundle> | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      devLog('🌐 Client-only address index loader initialized');
    }
  }

  static getInstance(): ClientOnlyAddressIndexLoader {
    if (!ClientOnlyAddressIndexLoader.instance) {
      ClientOnlyAddressIndexLoader.instance =
        new ClientOnlyAddressIndexLoader();
    }
    return ClientOnlyAddressIndexLoader.instance;
  }

  async loadAddressIndex(): Promise<FlexSearchIndexBundle> {
    if (this.bundle) {
      devLog('⚡ Using cached static address index');
      return this.bundle;
    }
    if (this.loadingPromise) {
      devLog('⏳ Waiting for static index load...');
      return this.loadingPromise;
    }

    devLog('🚀 Loading static FlexSearch index...');
    this.loadingPromise = this._loadStaticIndex().catch(async () => {
      const { loadVersionedBundle } = await import(
        '@workers/versionedBundleLoader'
      );
      const region = this._getRegionShardFromCookie();
      const config = {
        baseFilename: region,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extractDataFromIndex: (optimizedIndex: any) => optimizedIndex,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createLookupMap: (data: any) => data.addressData || {},
        createBundle: async (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lookup: any
        ): Promise<FlexSearchIndexBundle> => {
          const searchIndex = new Index(FLEXSEARCH_CONFIG);
          if (data.indexData) {
            searchIndex.import(data.indexData);
          }
          return {
            index: searchIndex,
            parcelIds: data.parcelIds || [],
            addressData: lookup
          };
        }
      };
      return loadVersionedBundle(config);
    });

    try {
      this.bundle = await this.loadingPromise;
      devLog('✅ Static FlexSearch index loaded and cached');
      return this.bundle;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async _loadStaticIndex(): Promise<FlexSearchIndexBundle> {
    try {
      const manifestResponse = await fetch('/search/latest.json');
      if (!manifestResponse.ok) {
        throw new Error(`Manifest not found: ${manifestResponse.status}`);
      }

      const manifest: ShardManifest = await manifestResponse.json();
      devLog(
        `📊 Found manifest v${manifest.version} with ${manifest.totalAddresses} addresses`
      );

      // Get region shard from cookie
      const regionShard = this._getRegionShardFromCookie();
      const regionData =
        manifest.regions[regionShard] || manifest.regions['stl_county'];

      if (!regionData) {
        throw new Error(`No region data for ${regionShard}`);
      }

      devLog(`🌎 Using region shard: ${regionShard}`);

      const indexResult = await this._loadFromExportedFiles(regionData);
      if (indexResult) {
        devLog(`✅ Loaded ${regionShard} shard from static files`);
        return indexResult;
      }

      throw new Error(`No valid index files for region ${regionShard}`);
    } catch (error) {
      logError('❌ Static index loading failed:', error);
      // Re-throw to maintain the Promise<FlexSearchIndexBundle> return type
      throw error;
    }
  }

  private async _loadFromExportedFiles(
    region: ShardManifest['regions'][string]
  ): Promise<FlexSearchIndexBundle | null> {
    try {
      devLog(
        `📤 Loading ${region.files.length} files for region ${region.region}...`
      );
      const searchIndex = new Index(FLEXSEARCH_CONFIG);

      // Load all .reg/.map parts except lookup and import them individually
      const indexFiles = region.files.filter((f) => !f.includes('lookup'));
      for (const filename of indexFiles) {
        const response = await fetch(`/search/${filename}`);
        if (!response.ok) {
          throw new Error(`Failed to load ${filename}: ${response.status}`);
        }

        const text = await response.text();
        let data = text ? JSON.parse(text) : null;

        // ✅ CRITICAL: Ensure we have actual arrays/objects, not JSON strings
        // If the data is a string, parse it to get the actual array/object
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
            devLog(`  🔧 Parsed stringified JSON for ${filename}`);
          } catch (parseError) {
            devLog(
              `  ⚠️ Failed to parse string data for ${filename}: ${parseError}`
            );
          }
        }

        // ✅ CRITICAL FIX: For FlexSearch.Index, import each part individually
        searchIndex.import(data);
        devLog(`  ✅ Imported ${filename}`);
      }

      // Load lookup
      const lookupResponse = await fetch(`/search/${region.lookup}`);
      if (!lookupResponse.ok) {
        throw new Error(`Failed to load lookup: ${lookupResponse.status}`);
      }
      const lookupData: AddressLookupData = await lookupResponse.json();

      return {
        index: searchIndex,
        parcelIds: lookupData.parcelIds,
        addressData: lookupData.addressData
      };
    } catch (error) {
      devLog(`⚠️ Export loading failed: ${error}`);
      return null;
    }
  }

  private _getRegionShardFromCookie(): string {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith('regionShard='));
    const region = match?.split('=')[1];

    // Map cookie values (with hyphens) to manifest keys (with underscores)
    if (region === 'stl-city') return 'stl_city';
    if (region === 'stl-county') return 'stl_county';

    // Default fallback
    return 'stl_county';
  }

  clearCache(): void {
    this.bundle = null;
    this.loadingPromise = null;
    devLog('🗑️ Static address index cache cleared');
  }
}

export async function loadAddressIndex(): Promise<FlexSearchIndexBundle> {
  const loader = ClientOnlyAddressIndexLoader.getInstance();
  return loader.loadAddressIndex();
}

export function clearAddressIndexCache(): void {
  const loader = ClientOnlyAddressIndexLoader.getInstance();
  loader.clearCache();
}
