import {
  loadGzippedData,
  decompressJsonData,
  setTestMockNodeModules,
  type NodeModules
} from '@lib/universalLoader';

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
 * Universal loader for optimized bundles with fallback to raw data
 * @param config Configuration object for the specific bundle type
 * @returns Loader object with methods to load, clear cache, and set test mocks
 */
export function createUniversalBundleLoader<TData, TOptimizedIndex, TBundle>(
  config: UniversalBundleConfig<TData, TOptimizedIndex, TBundle>
) {
  let cachedBundle: TBundle | null = null;

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
  }

  /**
   * Loads the bundle with optimized data and fallback
   */
  async function loadBundle(): Promise<TBundle> {
    if (cachedBundle) {
      return cachedBundle;
    }

    try {
      try {
        const gzippedData = await loadGzippedData(config.gzippedFilename);
        const optimizedIndex = decompressJsonData<TOptimizedIndex>(gzippedData);
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
          `📦 Loaded ${recordCount} records from optimized index (v${version})`
        );

        return cachedBundle;
      } catch (error) {
        console.warn(
          `Optimized ${config.gzippedFilename} not available, falling back to raw data:`,
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
