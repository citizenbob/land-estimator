import {
  loadGzippedData,
  decompressJsonData,
  setTestMockNodeModules,
  type NodeModules
} from '@lib/universalLoader';
import {
  getVersionManifest,
  type VersionManifest
} from '@services/versionManifest';
import { logError } from '@lib/errorUtils';

/**
 * Universal bundle interface for optimized and cached data loading
 */
export interface UniversalBundle<TData, TIndex> {
  data: TData[];
  lookup: Record<string, TData>;
  index?: TIndex;
}

/**
 * Configuration for universal bundle loader
 */
interface UniversalBundleConfig<TData, TOptimizedIndex, TBundle> {
  /** Filename of the gzipped optimized data */
  gzippedFilename: string;
  /** Base filename without version (e.g., 'address-index') for versioned loading */
  baseFilename?: string;
  /** Whether to use versioned CDN URLs */
  useVersioning?: boolean;
  /** Function to create lookup map from data array */
  createLookupMap: (data: TData[]) => Record<string, TData>;
  /** Function to load raw fallback data */
  loadRawData: () => Promise<TData[]>;
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
 * Loads gzipped data from a versioned CDN URL
 * @param url CDN URL to fetch from
 * @returns Promise<ArrayBuffer> Compressed data buffer
 */
async function loadVersionedGzippedData(url: string): Promise<ArrayBuffer> {
  console.log(`📥 Fetching versioned data from: ${url}`);

  try {
    const response = await fetch(url, {
      cache: 'force-cache'
    });

    if (!response.ok) {
      throw new Error(
        `CDN fetch failed: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`✅ Downloaded ${arrayBuffer.byteLength} bytes from CDN`);

    return arrayBuffer;
  } catch (error) {
    throw new Error(`Failed to load from CDN: ${error}`);
  }
}

/**
 * Universal loader for optimized bundles with fallback to raw data
 * @param config Configuration object for the specific bundle type
 * @returns Loader object with methods to load, clear cache, and set test mocks
 */
export function createUniversalBundleLoader<TData, TOptimizedIndex, TBundle>(
  config: UniversalBundleConfig<TData, TOptimizedIndex, TBundle>
) {
  let cachedBundle: TBundle | null = null;
  let cachedVersion: string | null = null;

  /**
   * Sets mock Node.js modules for testing
   */
  function setTestMockModules(mockModules: NodeModules | null): void {
    setTestMockNodeModules(mockModules);
  }

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
    const fileKey = config.baseFilename!.replace(
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

    const gzippedData = await loadVersionedGzippedData(url);
    const optimizedIndex = decompressJsonData<TOptimizedIndex>(
      new Uint8Array(gzippedData)
    );

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
  }

  /**
   * Loads the bundle with optimized data and fallback
   */
  async function loadBundle(): Promise<TBundle> {
    // If versioning is enabled, use versioned loading
    if (config.useVersioning && config.baseFilename) {
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

          // Both versions failed, continue to raw data fallback
          console.warn(
            `⚠️ Both versioned loads failed for ${config.baseFilename}, trying raw data fallback`
          );
          throw currentVersionError;
        }
      } catch (error) {
        // Last resort: try to load raw data
        try {
          console.log(
            `🆘 Loading ${config.baseFilename} from raw data fallback`
          );
          const rawData = await config.loadRawData();
          const lookup = config.createLookupMap(rawData);

          cachedBundle = await config.createBundle(rawData, lookup);
          cachedVersion = 'raw-fallback';

          console.log(
            `📦 Loaded ${rawData.length} records from raw data fallback`
          );
          return cachedBundle;
        } catch (rawError) {
          logError(rawError, {
            operation: 'versioned_bundle_load_raw_fallback',
            baseFilename: config.baseFilename,
            originalError: error
          });
          throw new Error(
            `All bundle loading methods failed for ${config.baseFilename}: ${rawError}`
          );
        }
      }
    }

    // Non-versioned loading (original behavior)
    if (cachedBundle) {
      console.log('📦 Using cached bundle');
      return cachedBundle;
    }

    console.log(`🔄 Loading bundle for: ${config.gzippedFilename}`);

    try {
      try {
        console.log(`📁 Attempting to load: ${config.gzippedFilename}`);
        const gzippedData = await loadGzippedData(config.gzippedFilename);
        console.log(`📊 Gzipped data size: ${gzippedData.byteLength} bytes`);

        const optimizedIndex = decompressJsonData<TOptimizedIndex>(gzippedData);
        console.log('🗜️ Successfully decompressed data');

        const data = config.extractDataFromIndex(optimizedIndex);
        const lookup = config.createLookupMap(data);

        let bundle = await config.createBundle(data, lookup);

        if (config.extractAdditionalData) {
          const additionalData = config.extractAdditionalData(optimizedIndex);
          bundle = { ...bundle, ...additionalData };
        }

        cachedBundle = bundle;

        const indexWithMeta = optimizedIndex as Record<string, unknown>;
        const recordCount =
          (indexWithMeta.recordCount as number) || data.length;
        const version = (indexWithMeta.version as string) || 'unknown';
        console.log(
          `✅ Loaded ${recordCount} records from optimized index (v${version})`
        );

        return cachedBundle;
      } catch (error) {
        console.error(
          `❌ Optimized ${config.gzippedFilename} failed, attempting fallback:`,
          error
        );
      }

      const rawData = await config.loadRawData();
      const lookup = config.createLookupMap(rawData);

      cachedBundle = await config.createBundle(rawData, lookup);

      console.log(`📦 Loaded ${rawData.length} records from raw data`);
      return cachedBundle;
    } catch (error) {
      throw new Error(`Bundle loading failed: ${error}`);
    }
  }

  return {
    loadBundle,
    clearCache,
    setTestMockModules
  };
}
