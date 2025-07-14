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

// Geographic sharding configuration
interface GeographicBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface GeoShardConfig {
  bounds: GeographicBounds;
  gridSize: number;
  overlap: number;
}

export interface GeoGrid {
  id: string;
  bounds: GeographicBounds;
  center: { lat: number; lng: number };
}

export interface ShardManifest {
  regions: Array<{
    region: string;
    version: string;
    document_file: string;
    grids: GeoGrid[];
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

  async loadAddressIndexProgressive(): Promise<FlexSearchIndexBundle> {
    if (this.bundle) {
      devLog('⚡ Using cached static address index');
      return this.bundle;
    }
    if (this.loadingPromise) {
      devLog('⏳ Waiting for static index load...');
      return this.loadingPromise;
    }

    devLog('🚀 Loading static FlexSearch index (progressive mode)...');
    this.loadingPromise = this._loadStaticIndexProgressive();

    try {
      this.bundle = await this.loadingPromise;
      devLog('✅ Static FlexSearch index loaded with progressive enhancement');
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

  private async _loadStaticIndexProgressive(): Promise<FlexSearchIndexBundle> {
    try {
      const manifestResponse = await fetch('/search/latest.json');
      if (!manifestResponse.ok) {
        throw new Error(`Manifest not found: ${manifestResponse.status}`);
      }

      const manifest: ShardManifest = await manifestResponse.json();
      devLog(
        `📊 Found manifest v${manifest.metadata.version} with ${manifest.metadata.total_regions} regions`
      );

      const regionShard = this._getRegionShardFromCookie();
      const regionData =
        manifest.regions.find((r) => r.region === regionShard) ||
        manifest.regions.find((r) => r.region === 'stl_county');

      if (!regionData) {
        throw new Error(`No region data for ${regionShard}`);
      }

      devLog(`🌎 Using region shard: ${regionShard} (progressive mode)`);

      const indexResult = await this._loadFromDocumentFile(regionData, true);
      if (indexResult) {
        devLog(`✅ Loaded ${regionShard} shard with progressive enhancement`);
        return indexResult;
      }

      throw new Error(`No valid index files for region ${regionShard}`);
    } catch (error) {
      logError('❌ Progressive static index loading failed:', error);
      throw error;
    }
  }

  private async _loadFromDocumentFile(
    region: ShardManifest['regions'][0],
    progressiveLoad = false
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

      if (progressiveLoad) {
        return this._buildProgressiveIndex(addresses, region.region);
      }

      return this._buildFullIndex(addresses, region.region);
    } catch (error) {
      devLog(`⚠️ Document loading failed: ${error}`);
      return null;
    }
  }

  private _buildFullIndex(
    addresses: Array<{ id: string; full_address: string }>,
    regionName: string
  ): FlexSearchIndexBundle {
    // Create new FlexSearch index
    const searchIndex = new Index(FLEXSEARCH_CONFIG);

    // Process the raw address data
    const parcelIds: string[] = [];
    const addressData: Record<string, string> = {};

    addresses.forEach((addr) => {
      const parcelId = addr.id;
      const fullAddress = addr.full_address;

      parcelIds.push(parcelId);
      addressData[parcelId] = fullAddress;

      // Add to FlexSearch index using parcel ID as document ID
      searchIndex.add(parcelId, fullAddress);
    });

    devLog(
      `  ✅ Built FlexSearch index with ${parcelIds.length} addresses for ${regionName}`
    );

    return {
      index: searchIndex,
      parcelIds,
      addressData
    };
  }

  private _buildProgressiveIndex(
    addresses: Array<{ id: string; full_address: string }>,
    regionName: string
  ): FlexSearchIndexBundle {
    // Sort addresses by popularity/importance (you could add this data)
    // For now, prioritize numbered streets which are more commonly searched
    const sortedAddresses = addresses.sort((a, b) => {
      const aHasNumber = /^\d+/.test(a.full_address);
      const bHasNumber = /^\d+/.test(b.full_address);
      if (aHasNumber && !bHasNumber) return -1;
      if (!aHasNumber && bHasNumber) return 1;
      return 0;
    });

    // Start with first 50K addresses for instant search
    const initialBatch = sortedAddresses.slice(0, 50000);
    const searchIndex = new Index(FLEXSEARCH_CONFIG);
    const parcelIds: string[] = [];
    const addressData: Record<string, string> = {};

    initialBatch.forEach((addr) => {
      const parcelId = addr.id;
      const fullAddress = addr.full_address;

      parcelIds.push(parcelId);
      addressData[parcelId] = fullAddress;
      searchIndex.add(parcelId, fullAddress);
    });

    devLog(
      `  ⚡ Built initial FlexSearch index with ${parcelIds.length} priority addresses for ${regionName}`
    );

    // Load remaining addresses in background
    setTimeout(() => {
      this._loadRemainingAddresses(
        sortedAddresses.slice(50000),
        searchIndex,
        parcelIds,
        addressData
      );
    }, 100);

    return {
      index: searchIndex,
      parcelIds,
      addressData
    };
  }

  private _loadRemainingAddresses(
    remainingAddresses: Array<{ id: string; full_address: string }>,
    searchIndex: Index,
    parcelIds: string[],
    addressData: Record<string, string>
  ) {
    const batchSize = 5000;
    let currentIndex = 0;

    const loadBatch = () => {
      const batch = remainingAddresses.slice(
        currentIndex,
        currentIndex + batchSize
      );

      batch.forEach((addr) => {
        const parcelId = addr.id;
        const fullAddress = addr.full_address;

        parcelIds.push(parcelId);
        addressData[parcelId] = fullAddress;
        searchIndex.add(parcelId, fullAddress);
      });

      currentIndex += batchSize;

      if (currentIndex < remainingAddresses.length) {
        // Load next batch after a small delay to avoid blocking
        setTimeout(loadBatch, 10);
      } else {
        devLog(
          `  ✅ Completed loading all ${parcelIds.length} addresses in background`
        );
      }
    };

    loadBatch();
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

  async loadAddressIndexByLocation(userLocation?: {
    lat: number;
    lng: number;
  }): Promise<FlexSearchIndexBundle> {
    if (!userLocation) {
      // Fallback to current behavior if no location provided
      return this.loadAddressIndex();
    }

    // Check if we have a cached bundle for this location
    const gridId = GeographicSharding.getGridIdForLocation(
      userLocation.lat,
      userLocation.lng
    );

    devLog(`🌎 Loading addresses near user location (grid: ${gridId})`);

    // For now, load the full region and filter - in production you'd have pre-built grid files
    const fullBundle = await this.loadAddressIndex();
    return this._filterBundleByLocation(fullBundle, userLocation);
  }

  private _filterBundleByLocation(
    bundle: FlexSearchIndexBundle,
    userLocation: { lat: number; lng: number }
  ): FlexSearchIndexBundle {
    const gridIds = GeographicSharding.getNeighboringGrids(
      GeographicSharding.getGridIdForLocation(
        userLocation.lat,
        userLocation.lng
      )
    );

    devLog(`🗺️ Filtering addresses for grids: ${gridIds.join(', ')}`);

    // Create new filtered index
    const filteredIndex = new Index(FLEXSEARCH_CONFIG);
    const filteredParcelIds: string[] = [];
    const filteredAddressData: Record<string, string> = {};

    // Filter addresses by proximity (this is a simplified version)
    // In production, you'd have latitude/longitude data for each address
    bundle.parcelIds.forEach((parcelId) => {
      const address = bundle.addressData[parcelId];
      if (address) {
        // For now, include all addresses - you'd add lat/lng filtering here
        filteredParcelIds.push(parcelId);
        filteredAddressData[parcelId] = address;
        filteredIndex.add(parcelId, address);
      }
    });

    devLog(`🎯 Filtered to ${filteredParcelIds.length} nearby addresses`);

    return {
      index: filteredIndex,
      parcelIds: filteredParcelIds,
      addressData: filteredAddressData
    };
  }
}

export async function loadAddressIndex(): Promise<FlexSearchIndexBundle> {
  const loader = ClientOnlyAddressIndexLoader.getInstance();
  return loader.loadAddressIndex();
}

export async function loadAddressIndexProgressive(): Promise<FlexSearchIndexBundle> {
  const loader = ClientOnlyAddressIndexLoader.getInstance();
  return loader.loadAddressIndexProgressive();
}

export async function loadAddressIndexByLocation(userLocation?: {
  lat: number;
  lng: number;
}): Promise<FlexSearchIndexBundle> {
  const loader = ClientOnlyAddressIndexLoader.getInstance();
  return loader.loadAddressIndexByLocation(userLocation);
}

export async function loadAddressIndexWithGeolocation(): Promise<FlexSearchIndexBundle> {
  const userLocation = await GeographicSharding.getUserLocation();
  return loadAddressIndexByLocation(userLocation || undefined);
}

export function clearAddressIndexCache(): void {
  const loader = ClientOnlyAddressIndexLoader.getInstance();
  loader.clearCache();
}

// Geographic utilities
class GeographicSharding {
  private static readonly GEO_CONFIG: GeoShardConfig = {
    bounds: {
      north: 38.8,
      south: 38.4,
      east: -90.0,
      west: -90.6
    },
    // Approximately 3.5 miles per grid cell
    gridSize: 0.05,
    // Overlap between grids for boundary addresses
    overlap: 0.01
  };

  static getGridIdForLocation(lat: number, lng: number): string {
    const config = this.GEO_CONFIG;
    const gridLat = Math.floor((lat - config.bounds.south) / config.gridSize);
    const gridLng = Math.floor((lng - config.bounds.west) / config.gridSize);
    return `grid_${gridLat}_${gridLng}`;
  }

  static getGridBounds(gridId: string): GeographicBounds {
    const [, latIndex, lngIndex] = gridId.split('_').map(Number);
    const config = this.GEO_CONFIG;

    return {
      south: config.bounds.south + latIndex * config.gridSize - config.overlap,
      north:
        config.bounds.south + (latIndex + 1) * config.gridSize + config.overlap,
      west: config.bounds.west + lngIndex * config.gridSize - config.overlap,
      east:
        config.bounds.west + (lngIndex + 1) * config.gridSize + config.overlap
    };
  }

  static getNeighboringGrids(centerGridId: string): string[] {
    const [, latIndex, lngIndex] = centerGridId.split('_').map(Number);
    const grids: string[] = [];

    // Include center grid and 8 surrounding grids
    for (let latOffset = -1; latOffset <= 1; latOffset++) {
      for (let lngOffset = -1; lngOffset <= 1; lngOffset++) {
        grids.push(`grid_${latIndex + latOffset}_${lngIndex + lngOffset}`);
      }
    }

    return grids;
  }

  static async getUserLocation(): Promise<{ lat: number; lng: number } | null> {
    if (!navigator.geolocation) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }
}
