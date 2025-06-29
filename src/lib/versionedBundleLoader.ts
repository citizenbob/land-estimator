import {
  getVersionManifest,
  type VersionManifest
} from '@services/versionManifest';
import { logError } from '@lib/errorUtils';
import { decompressSync } from 'fflate';

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
 * Fallback sources for data loading in order of preference
 */
enum DataSource {
  VERCEL_BLOB = 'Vercel Blob Storage',
  FIREBASE_STORAGE = 'Firebase Storage',
  SERVICE_WORKER_CACHE = 'Service Worker Cache',
  BROWSER_CACHE = 'Browser Cache'
}

/**
 * Loads data with comprehensive fallback chain:
 * 1. Vercel Blob Storage (primary CDN)
 * 2. Firebase Storage (backup CDN)
 * 3. Service Worker Cache (if available)
 * 4. Browser Cache API (last resort)
 */
async function loadWithFallbackChain(
  url: string,
  baseFilename: string
): Promise<ArrayBuffer> {
  const errors: Array<{ source: DataSource; error: string }> = [];

  // 1. Try Vercel Blob Storage (primary)
  try {
    console.log(`📥 [${DataSource.VERCEL_BLOB}] Fetching: ${url}`);
    const response = await fetch(url, { cache: 'force-cache' });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      console.log(
        `✅ [${DataSource.VERCEL_BLOB}] Loaded ${arrayBuffer.byteLength} bytes`
      );
      return arrayBuffer;
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push({ source: DataSource.VERCEL_BLOB, error: errorMsg });
    console.warn(`⚠️ [${DataSource.VERCEL_BLOB}] Failed: ${errorMsg}`);
  }

  // 2. Try Firebase Storage (backup CDN)
  try {
    // Extract filename from Vercel Blob URL and construct Firebase Storage URL
    const filename = url.split('/').pop();
    const firebaseStorageBucket =
      process.env.NEXT_PUBLIC_FB_MAIN_BUCKET ||
      process.env.FIREBASE_STORAGE_BUCKET;

    if (!firebaseStorageBucket) {
      throw new Error('Firebase storage bucket not configured in environment');
    }

    const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseStorageBucket}/o/cdn%2F${filename}?alt=media`;

    console.log(`📥 [${DataSource.FIREBASE_STORAGE}] Fetching: ${firebaseUrl}`);
    const response = await fetch(firebaseUrl, { cache: 'force-cache' });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      console.log(
        `✅ [${DataSource.FIREBASE_STORAGE}] Loaded ${arrayBuffer.byteLength} bytes`
      );
      return arrayBuffer;
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push({ source: DataSource.FIREBASE_STORAGE, error: errorMsg });
    console.warn(`⚠️ [${DataSource.FIREBASE_STORAGE}] Failed: ${errorMsg}`);
  }

  // 3. Try Service Worker Cache (if available)
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      console.log(
        `📥 [${DataSource.SERVICE_WORKER_CACHE}] Checking cache for: ${url}`
      );

      // Try the specific cache first
      const cache = await caches.open('versioned-index-cache-v1');
      let cachedResponse = await cache.match(url);

      // If not found, try with alternative URL patterns (Vercel Blob vs Firebase)
      if (!cachedResponse) {
        const firebaseStorageBucket =
          process.env.NEXT_PUBLIC_FB_MAIN_BUCKET ||
          process.env.FIREBASE_STORAGE_BUCKET;
        const filename = url.split('/').pop();

        const alternativeUrls = [
          url,
          // Try Firebase Storage URL pattern if we have bucket config
          ...(firebaseStorageBucket
            ? [
                `https://firebasestorage.googleapis.com/v0/b/${firebaseStorageBucket}/o/cdn%2F${filename}?alt=media`
              ]
            : []),
          // Try other Vercel Blob patterns if needed
          url.replace('/cdn/', '/data/')
        ];

        for (const altUrl of alternativeUrls) {
          cachedResponse = await cache.match(altUrl);
          if (cachedResponse) {
            console.log(
              `📦 Found cached response for alternative URL: ${altUrl}`
            );
            break;
          }
        }
      }

      if (cachedResponse) {
        const arrayBuffer = await cachedResponse.arrayBuffer();
        console.log(
          `✅ [${DataSource.SERVICE_WORKER_CACHE}] Loaded ${arrayBuffer.byteLength} bytes from cache`
        );
        return arrayBuffer;
      }
      throw new Error('Not found in service worker cache');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ source: DataSource.SERVICE_WORKER_CACHE, error: errorMsg });
      console.warn(
        `⚠️ [${DataSource.SERVICE_WORKER_CACHE}] Failed: ${errorMsg}`
      );
    }
  }

  // 4. Try Browser Cache API (last resort)
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      console.log(
        `📥 [${DataSource.BROWSER_CACHE}] Checking browser cache for: ${url}`
      );
      const cacheNames = await caches.keys();

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(url);

        if (cachedResponse) {
          const arrayBuffer = await cachedResponse.arrayBuffer();
          console.log(
            `✅ [${DataSource.BROWSER_CACHE}] Loaded ${arrayBuffer.byteLength} bytes from ${cacheName}`
          );
          return arrayBuffer;
        }
      }
      throw new Error('Not found in any browser cache');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ source: DataSource.BROWSER_CACHE, error: errorMsg });
      console.warn(`⚠️ [${DataSource.BROWSER_CACHE}] Failed: ${errorMsg}`);
    }
  }

  // All fallbacks failed - create comprehensive error
  const errorSummary = errors.map((e) => `${e.source}: ${e.error}`).join('; ');
  throw new Error(
    `All data sources failed for ${baseFilename}. Errors: ${errorSummary}`
  );
}

/**
 * Decompresses JSON data from ArrayBuffer using fflate
 * @param compressedData Gzipped data buffer
 * @returns Parsed JSON object
 */
function decompressVersionedJsonData<T>(compressedData: ArrayBuffer): T {
  try {
    const uint8Array = new Uint8Array(compressedData);
    const decompressed = decompressSync(uint8Array);
    const jsonString = new TextDecoder().decode(decompressed);
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Failed to decompress JSON data: ${error}`);
  }
}

/**
 * Creates a versioned bundle loader that fetches from CDN based on version manifest
 * @param config Configuration for the specific bundle type
 * @returns Loader object with methods to load, clear cache, and set test mocks
 */
export function createVersionedBundleLoader<TData, TOptimizedIndex, TBundle>(
  config: VersionedBundleConfig<TData, TOptimizedIndex, TBundle>
) {
  let cachedBundle: TBundle | null = null;
  let cachedVersion: string | null = null;

  /**
   * Clears the cached bundle
   */
  function clearCache(): void {
    cachedBundle = null;
    cachedVersion = null;
  }

  /**
   * Attempts to load bundle from a specific version
   * @param manifest Version manifest
   * @param useCurrentVersion Whether to use current (true) or previous (false) version
   * @returns Promise<TBundle> Loaded bundle
   */
  async function loadBundleFromVersion(
    manifest: VersionManifest,
    useCurrentVersion: boolean = true
  ): Promise<TBundle> {
    const versionInfo = useCurrentVersion
      ? manifest.current
      : manifest.previous;

    if (!versionInfo) {
      throw new Error(
        `No ${useCurrentVersion ? 'current' : 'previous'} version available`
      );
    }

    const version = versionInfo.version;
    const fileKey = config.baseFilename.replace(
      '-',
      '_'
    ) as keyof typeof versionInfo.files;
    const url = versionInfo.files[fileKey];

    if (!url) {
      throw new Error(
        `No URL found for ${config.baseFilename} in version ${version}`
      );
    }

    console.log(`🔄 Loading ${config.baseFilename} from version ${version}`);

    try {
      const gzippedData = await loadWithFallbackChain(url, config.baseFilename);
      const optimizedIndex =
        decompressVersionedJsonData<TOptimizedIndex>(gzippedData);

      const data = config.extractDataFromIndex(optimizedIndex);
      const lookup = config.createLookupMap(data);

      let bundle = await config.createBundle(data, lookup);

      if (config.extractAdditionalData) {
        const additionalData = config.extractAdditionalData(optimizedIndex);
        bundle = await Promise.resolve({
          ...bundle,
          ...additionalData
        } as TBundle);
      }

      console.log(
        `✅ Loaded ${data.length} records from ${config.baseFilename} v${version}`
      );
      return bundle;
    } catch (error) {
      throw new Error(
        `Failed to load ${config.baseFilename} from version ${version}: ${error}`
      );
    }
  }

  /**
   * Loads the bundle with version-aware CDN fetching and fallback
   */
  async function loadBundle(): Promise<TBundle> {
    try {
      // Get current version manifest
      const manifest = await getVersionManifest();
      const currentVersion = manifest.current.version;

      // Check if we have cached bundle for current version
      if (cachedBundle && cachedVersion === currentVersion) {
        console.log(
          `📦 Using cached ${config.baseFilename} for version ${currentVersion}`
        );
        return cachedBundle;
      }

      // Try to load from current version
      try {
        const bundle = await loadBundleFromVersion(manifest, true);
        cachedBundle = bundle;
        cachedVersion = currentVersion;
        return bundle;
      } catch (currentVersionError) {
        console.warn(
          `⚠️ Failed to load ${config.baseFilename} from current version ${currentVersion}`
        );
        logError(currentVersionError, {
          operation: 'versioned_bundle_load_current',
          baseFilename: config.baseFilename,
          version: currentVersion
        });

        // Fallback to previous version
        if (manifest.previous) {
          try {
            console.log(
              `🔄 Falling back to previous version ${manifest.previous.version}`
            );
            const bundle = await loadBundleFromVersion(manifest, false);
            cachedBundle = bundle;
            cachedVersion = manifest.previous.version;

            console.warn(
              `⚠️ Successfully loaded ${config.baseFilename} from fallback version ${manifest.previous.version}`
            );
            return bundle;
          } catch (previousVersionError) {
            logError(previousVersionError, {
              operation: 'versioned_bundle_load_previous',
              baseFilename: config.baseFilename,
              version: manifest.previous.version
            });
          }
        }

        // Both versions failed - graceful failure
        console.warn(
          `⚠️ Both versioned loads failed for ${config.baseFilename}, all CDN sources exhausted`
        );
        throw currentVersionError;
      }
    } catch (error) {
      // Graceful failure - provide user-friendly error
      const userMessage = `Unable to load ${config.baseFilename} data. This may be due to network connectivity issues or temporary service unavailability. Please try refreshing the page or check your internet connection.`;

      logError(error, {
        operation: 'versioned_bundle_load_all_failed',
        baseFilename: config.baseFilename,
        userMessage
      });

      throw new Error(userMessage);
    }
  }

  return {
    loadBundle,
    clearCache
  };
}
