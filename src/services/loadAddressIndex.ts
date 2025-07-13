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
  regions: Array<{
    region: string;
    version: string;
    document_file: string;
    lookup_file: string;
  }>;
  metadata: {
    generated_at: string;
    version: string;
    total_regions: number;
    source: string;
  };
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
    this.loadingPromise = this._loadStaticIndex();

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
        `📊 Found manifest v${manifest.metadata.version} with ${manifest.metadata.total_regions} regions`
      );

      // Get region shard from cookie
      const regionShard = this._getRegionShardFromCookie();
      const regionData =
        manifest.regions.find((r) => r.region === regionShard) ||
        manifest.regions.find((r) => r.region === 'stl_county');

      if (!regionData) {
        throw new Error(`No region data for ${regionShard}`);
      }

      devLog(`🌎 Using region shard: ${regionShard}`);

      const indexResult = await this._loadFromDocumentFile(regionData);
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

  private async _loadFromDocumentFile(
    region: ShardManifest['regions'][0]
  ): Promise<FlexSearchIndexBundle | null> {
    try {
      devLog(`📤 Loading document file for region ${region.region}...`);

      // Load the document file which contains raw address data
      const response = await fetch(`/search/${region.document_file}`);
      if (!response.ok) {
        throw new Error(
          `Failed to load ${region.document_file}: ${response.status}`
        );
      }

      const addresses = await response.json();

      // Create new FlexSearch index
      const searchIndex = new Index(FLEXSEARCH_CONFIG);

      // Process the raw address data
      const parcelIds: string[] = [];
      const addressData: Record<string, string> = {};

      addresses.forEach(
        (addr: { id: string; full_address: string }, index: number) => {
          const parcelId = addr.id;
          const fullAddress = addr.full_address;

          parcelIds.push(parcelId);
          addressData[parcelId] = fullAddress;

          // Add to FlexSearch index
          searchIndex.add(index, fullAddress);
        }
      );

      devLog(
        `  ✅ Built FlexSearch index with ${parcelIds.length} addresses for ${region.region}`
      );

      return {
        index: searchIndex,
        parcelIds,
        addressData
      };
    } catch (error) {
      devLog(`⚠️ Document loading failed: ${error}`);
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
