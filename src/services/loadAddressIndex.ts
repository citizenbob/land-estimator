/**
 * Static FlexSearch Index Loader - Document Mode Only
 *
 * Works with Vercel Edge Middleware:
 * - Detects user's region shard via cookie (set by middleware)
 * - Loads only that region's Document Mode files from local static files
 * - Rebuilds index once on first use, then caches forever
 * - Client-only operation (no SSR)
 * - NO CDN fallback - static files only
 */

import { Document } from 'flexsearch';
import { devLog, logError } from '@lib/logger';

// Types
export interface FlexSearchIndexBundle {
  index: Document<Record<string, unknown>>;
  parcelIds: string[];
  addressData: Record<string, string>;
}

export interface DocumentModeManifest {
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

// FlexSearch Document Mode configuration
const FLEXSEARCH_DOCUMENT_CONFIG = {
  tokenize: 'forward',
  threshold: 0,
  resolution: 1,
  document: {
    id: 'id',
    index: ['full_address']
  }
};

class ClientOnlyAddressIndexLoader {
  private static instance: ClientOnlyAddressIndexLoader | null = null;
  private bundle: FlexSearchIndexBundle | null = null;
  private loadingPromise: Promise<FlexSearchIndexBundle> | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      devLog('🌐 Client-only Document Mode address index loader initialized');
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
      devLog('⚡ Using cached Document Mode address index');
      return this.bundle;
    }
    if (this.loadingPromise) {
      devLog('⏳ Waiting for Document Mode index load...');
      return this.loadingPromise;
    }

    devLog('🚀 Loading Document Mode FlexSearch index from static files...');
    this.loadingPromise = this._loadDocumentModeIndex();

    try {
      this.bundle = await this.loadingPromise;
      devLog('✅ Document Mode FlexSearch index loaded and cached');
      return this.bundle;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async _loadDocumentModeIndex(): Promise<FlexSearchIndexBundle> {
    try {
      // Handle both browser and Node.js environments
      const baseUrl =
        typeof window !== 'undefined' ? '' : 'http://localhost:3000';

      devLog('📄 Loading Document Mode manifest from static files...');
      const manifestResponse = await fetch(`${baseUrl}/search/latest.json`);
      if (!manifestResponse.ok) {
        throw new Error(
          `Document Mode manifest not found at /search/latest.json: ${manifestResponse.status}`
        );
      }

      const manifest = (await manifestResponse.json()) as DocumentModeManifest;

      // Validate manifest structure
      if (!manifest.regions || !Array.isArray(manifest.regions)) {
        throw new Error(
          'Invalid Document Mode manifest: missing or invalid regions array'
        );
      }

      devLog(
        `📊 Found Document Mode manifest v${manifest.metadata.version} with ${manifest.regions.length} regions`
      );

      // Get region shard from cookie
      const regionShard = this._getRegionShardFromCookie();
      let regionData = manifest.regions.find((r) => r.region === regionShard);

      // Fallback to stl_county if original region not found
      let finalRegion = regionShard;
      if (!regionData) {
        finalRegion = 'stl_county';
        regionData = manifest.regions.find((r) => r.region === finalRegion);
      }

      if (!regionData) {
        throw new Error(
          `No region data found for ${finalRegion}. Available regions: ${manifest.regions.map((r) => r.region).join(', ')}`
        );
      }

      devLog(`🌎 Using region shard: ${regionData.region}`);

      return await this._loadDocumentModeFiles(regionData, baseUrl);
    } catch (error) {
      logError('❌ Document Mode index loading failed:', error);
      throw error;
    }
  }

  private async _loadDocumentModeFiles(
    regionData: DocumentModeManifest['regions'][0],
    baseUrl: string
  ): Promise<FlexSearchIndexBundle> {
    try {
      devLog(
        `📄 Loading Document Mode files for region ${regionData.region}...`
      );

      // Create FlexSearch Document index
      const searchIndex = new Document(FLEXSEARCH_DOCUMENT_CONFIG);

      // Load document.json file (contains the addresses for FlexSearch Document Mode)
      devLog(`  📄 Loading document file: ${regionData.document_file}`);
      const documentResponse = await fetch(
        `${baseUrl}/search/${regionData.document_file}`
      );
      if (!documentResponse.ok) {
        throw new Error(
          `Failed to load document file ${regionData.document_file}: ${documentResponse.status}`
        );
      }

      const documents = await documentResponse.json();
      if (!Array.isArray(documents)) {
        throw new Error(
          `Invalid document file format: expected array, got ${typeof documents}`
        );
      }

      devLog(`  📊 Found ${documents.length} documents to index`);

      // Add all documents to the FlexSearch Document index
      let validDocuments = 0;
      for (const doc of documents) {
        if (
          !doc.id ||
          !doc.full_address ||
          typeof doc.full_address !== 'string'
        ) {
          logError('⚠️ Skipping invalid document:', doc);
          continue;
        }
        searchIndex.add(doc);
        validDocuments++;
      }

      devLog(`  ✅ Indexed ${validDocuments} addresses in Document Mode`);

      // Load lookup data
      devLog(`  📄 Loading lookup file: ${regionData.lookup_file}`);
      const lookupResponse = await fetch(
        `${baseUrl}/search/${regionData.lookup_file}`
      );
      if (!lookupResponse.ok) {
        throw new Error(
          `Failed to load lookup file ${regionData.lookup_file}: ${lookupResponse.status}`
        );
      }

      const lookupData: AddressLookupData = await lookupResponse.json();
      if (!lookupData.parcelIds || !lookupData.addressData) {
        throw new Error(
          'Invalid lookup file format: missing parcelIds or addressData'
        );
      }

      devLog(`✅ Loaded ${regionData.region} shard from Document Mode files`);

      return {
        index: searchIndex,
        parcelIds: lookupData.parcelIds,
        addressData: lookupData.addressData
      };
    } catch (error) {
      logError(`❌ Document Mode file loading failed: ${error}`);
      throw error;
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
    devLog('🗑️ Document Mode address index cache cleared');
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
