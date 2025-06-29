import { getVersionManifest } from '@services/versionManifest';
import { logError } from '@lib/errorUtils';
import { decompressSync } from 'fflate';

// Type for cache entries
type CacheEntry = {
  bundle: unknown;
  version: string;
  timestamp: number;
  sizeBytes: number;
};

// Type for the cache Map
type CacheMap = Map<string, CacheEntry>;

/**
 * In-memory cache for decompressed bundles
 * Uses globalThis to persist across Next.js hot reloads in development
 */
const getMemoryCache = (): CacheMap => {
  const globalKey = '__versionedBundleCache';

  if (typeof globalThis !== 'undefined') {
    // Use global cache that survives module reloads
    if (!(globalThis as Record<string, unknown>)[globalKey]) {
      (globalThis as Record<string, unknown>)[globalKey] = new Map<
        string,
        CacheEntry
      >();
      console.log(
        '🏗️ [Memory Cache] Initialized global cache for module reloading'
      );
    }
    return (globalThis as Record<string, unknown>)[globalKey] as CacheMap;
  }

  // Fallback for environments without globalThis
  if (typeof global !== 'undefined') {
    if (!(global as Record<string, unknown>)[globalKey]) {
      (global as Record<string, unknown>)[globalKey] = new Map<
        string,
        CacheEntry
      >();
    }
    return (global as Record<string, unknown>)[globalKey] as CacheMap;
  }

  // Final fallback
  return new Map<string, CacheEntry>();
};

const memoryCache = getMemoryCache();

// Promise cache to prevent parallel requests for the same resource
const promiseCache = new Map<string, Promise<unknown>>();

const MEMORY_CACHE_DURATION =
  process.env.NODE_ENV === 'development' ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000;

/**
 * Clean up expired entries from memory cache to prevent memory leaks
 */
function cleanupMemoryCache(): void {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, entry] of memoryCache.entries()) {
    if (now - entry.timestamp > MEMORY_CACHE_DURATION) {
      memoryCache.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 [Memory Cache] Cleaned up ${cleanedCount} expired entries`);
  }
}

if (typeof global !== 'undefined') {
  setInterval(cleanupMemoryCache, 10 * 60 * 1000);
}

/**
 * Configuration for versioned bundle loader
 */
interface VersionedBundleConfig<TData, TOptimizedIndex, TBundle> {
  /** Base filename without version (e.g., 'address-index') */
  baseFilename: string;
  /** Function to create lookup map from data array */
  createLookupMap: (data: TData[]) => Record<string, TData>;
  /** Function to extract data array from optimized index */
  extractDataFromIndex: (index: TOptimizedIndex) => TData[];
  /** Function to create final bundle from data and lookup */
  createBundle: (
    data: TData[],
    lookup: Record<string, TData>
  ) => TBundle | Promise<TBundle>;
  /** Optional function to extract additional data (like search index) */
  extractAdditionalData?: (index: TOptimizedIndex) => Record<string, unknown>;
}

/**
 * Loads data directly from CDN with no-store cache policy
 * CDN-only source of truth - no local fallback, no Next.js fetch cache
 */
async function loadFromCDN(
  url: string,
  baseFilename: string
): Promise<ArrayBuffer> {
  console.log(`📥 [CDN] Fetching ${baseFilename}: ${url}`);

  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const sizeMB = Math.round((arrayBuffer.byteLength / 1024 / 1024) * 100) / 100;

  console.log(
    `✅ [CDN] Loaded ${sizeMB}MB (${arrayBuffer.byteLength} bytes) from CDN`
  );

  return arrayBuffer;
}

/**
 * Decompresses a gzipped ArrayBuffer using fflate
 */
function decompressData(compressedData: ArrayBuffer): string {
  const uint8Array = new Uint8Array(compressedData);
  const decompressed = decompressSync(uint8Array);
  return new TextDecoder('utf-8').decode(decompressed);
}

/**
 * Main loader function that fetches, decompresses, and caches versioned bundles
 * Always fetches from CDN with no-store policy - no fallbacks
 */
export async function loadVersionedBundle<TData, TOptimizedIndex, TBundle>(
  config: VersionedBundleConfig<TData, TOptimizedIndex, TBundle>
): Promise<TBundle> {
  const { baseFilename, createLookupMap, extractDataFromIndex, createBundle } =
    config;

  const cacheKey = `bundle:${baseFilename}`;
  const promiseKey = `promise:${baseFilename}`;

  try {
    console.log(`🔍 [Memory Cache] Checking cache for: ${baseFilename}`);
    console.log(
      `🔍 [Memory Cache] Current cache entries: ${Array.from(memoryCache.keys()).join(', ')}`
    );

    const cached = memoryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_DURATION) {
      console.log(
        `🎯 [Memory Cache] Serving ${baseFilename} from memory (v${cached.version}) - FAST PATH!`
      );
      return cached.bundle as TBundle;
    }

    // Check if there's already a promise in flight for this resource
    const existingPromise = promiseCache.get(promiseKey);
    if (existingPromise) {
      console.log(
        `⏳ [Promise Cache] Waiting for existing ${baseFilename} request...`
      );
      return existingPromise as Promise<TBundle>;
    }

    console.log(
      `🌐 [Memory Cache] Cache miss for ${baseFilename}, fetching from CDN...`
    );

    // Create and cache the promise to prevent parallel requests
    const loadPromise = (async (): Promise<TBundle> => {
      try {
        const manifest = await getVersionManifest();

        const fileKey = baseFilename.replace(
          '-',
          '_'
        ) as keyof typeof manifest.current.files;
        const fileUrl = manifest.current.files[fileKey];

        if (!fileUrl) {
          throw new Error(`File URL not found for ${baseFilename}`);
        }

        // Construct full CDN URL - handle both relative and absolute paths
        const cdnUrl = fileUrl.startsWith('http')
          ? fileUrl
          : `https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/${fileUrl}`;

        const compressedData = await loadFromCDN(cdnUrl, baseFilename);

        const jsonString = decompressData(compressedData);
        const optimizedIndex = JSON.parse(jsonString) as TOptimizedIndex;

        const data = extractDataFromIndex(optimizedIndex);
        const lookup = createLookupMap(data);
        const bundle = await createBundle(data, lookup);

        memoryCache.set(cacheKey, {
          bundle,
          version: manifest.current.version,
          timestamp: Date.now(),
          sizeBytes: compressedData.byteLength
        });

        console.log(
          `💾 [Memory Cache] Cached ${baseFilename} v${manifest.current.version} (${compressedData.byteLength} bytes)`
        );

        return bundle;
      } finally {
        // Clean up the promise cache once the request completes
        promiseCache.delete(promiseKey);
      }
    })();

    promiseCache.set(promiseKey, loadPromise);
    return await loadPromise;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logError(error, { baseFilename });
    throw new Error(`Failed to load ${baseFilename}: ${errorMsg}`);
  }
}

/**
 * Clear memory cache for testing or explicit cache invalidation
 */
export function clearMemoryCache(): void {
  const memoryCount = memoryCache.size;
  const promiseCount = promiseCache.size;
  memoryCache.clear();
  promiseCache.clear();
  console.log(
    `🗑️ [Memory Cache] Cleared ${memoryCount} entries and ${promiseCount} promises`
  );
}

/**
 * Get memory cache statistics
 */
export function getCacheStats(): {
  entryCount: number;
  totalSizeBytes: number;
  entries: Array<{
    key: string;
    version: string;
    sizeBytes: number;
    ageMinutes: number;
  }>;
} {
  const now = Date.now();
  const entries = Array.from(memoryCache.entries()).map(([key, entry]) => ({
    key,
    version: entry.version,
    sizeBytes: entry.sizeBytes,
    ageMinutes: Math.round((now - entry.timestamp) / 60000)
  }));

  return {
    entryCount: memoryCache.size,
    totalSizeBytes: entries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    entries
  };
}

export function decompressVersionedJsonData<T>(compressedData: ArrayBuffer): T {
  const uint8Array = new Uint8Array(compressedData);
  const decompressed = decompressSync(uint8Array);
  const jsonString = new TextDecoder('utf-8').decode(decompressed);
  return JSON.parse(jsonString) as T;
}
