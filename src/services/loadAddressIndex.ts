import FlexSearch from 'flexsearch';
import { decompressSync } from 'fflate';

let cachedBundle: FlexSearch.FlexSearchIndexBundle | null = null;

/**
 * Detects if code is running in browser environment.
 * @returns True if running in browser, false if in Node.js
 */
function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.document !== 'undefined' &&
    typeof fetch !== 'undefined'
  );
}

/**
 * Loads gzipped address index data from filesystem or network.
 * Uses fetch in browser environments and Node.js fs in server environments.
 * Dynamic imports are used to avoid bundling Node.js modules in client code.
 * @returns Compressed index data as Uint8Array
 * @throws When index file cannot be loaded or accessed
 */
/**
 * Mock storage for test environments
 * @internal - For testing only
 */
let _testMockNodeModules: {
  fs: {
    readFileSync: (path: string) => Uint8Array;
    existsSync: (path: string) => boolean;
  };
  path: { join: (...paths: string[]) => string };
} | null = null;

/**
 * Sets mock Node.js modules for testing
 * @internal - For testing only
 */
export function _setTestMockNodeModules(
  mockModules: {
    fs: {
      readFileSync: (path: string) => Uint8Array;
      existsSync: (path: string) => boolean;
    };
    path: { join: (...paths: string[]) => string };
  } | null
): void {
  _testMockNodeModules = mockModules;
}

/**
 * Dynamically imports Node.js modules only in server environment
 * Exported for testing purposes
 */
export async function importNodeModules() {
  if (_testMockNodeModules) {
    return _testMockNodeModules;
  }
  if (isBrowser()) {
    throw new Error(
      'Node.js modules cannot be imported in browser environment'
    );
  }

  try {
    const fsModule = await new Function('return import("node:fs")')();
    const pathModule = await new Function('return import("node:path")')();

    return {
      fs: fsModule,
      path: pathModule
    };
  } catch (error) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path');
        return {
          fs: { readFileSync: fs.readFileSync, existsSync: fs.existsSync },
          path: { join: path.join }
        };
      } catch {
        throw new Error('Cannot import Node.js modules in test environment');
      }
    }
    throw error;
  }
}

async function loadGzippedIndexData(): Promise<Uint8Array> {
  if (isBrowser()) {
    const response = await fetch('/address-index.json.gz');
    if (!response.ok) {
      throw new Error(
        `Failed to fetch index: ${response.status} ${response.statusText}`
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  } else {
    const { fs, path } = await importNodeModules();

    const projectRoot = process.cwd();
    const filePath = path.join(projectRoot, 'public', 'address-index.json.gz');

    if (!fs.existsSync(filePath)) {
      throw new Error(`Index file not found: ${filePath}`);
    }

    return fs.readFileSync(filePath);
  }
}

/**
 * Decompresses and parses the gzipped index data.
 * @param gzippedData - Compressed index data
 * @returns Parsed index data structure
 * @throws When decompression or JSON parsing fails
 */
function decompressIndexData(
  gzippedData: Uint8Array
): FlexSearch.PrecomputedIndexData {
  const decompressed = decompressSync(gzippedData);
  const jsonString = new TextDecoder().decode(decompressed);
  return JSON.parse(jsonString);
}

/**
 * Creates address lookup map for search result mapping.
 * Falls back to extracting addresses from search strings if address index is unavailable.
 * @param indexData - The parsed index data
 * @returns Map of parcel IDs to addresses
 */
async function createAddressLookupMap(
  indexData: FlexSearch.PrecomputedIndexData
): Promise<Record<string, string>> {
  const addressData: Record<string, string> = {};

  try {
    const addressIndexModule = await import('@data/address_index.json');
    Object.assign(addressData, addressIndexModule.default);
  } catch {
    indexData.parcelIds.forEach((parcelId, idx) => {
      const searchString = indexData.searchStrings[idx];
      const address = searchString.replace(` ${parcelId}`, '');
      addressData[parcelId] = address;
    });
  }

  return addressData;
}

/**
 * Creates a search index from precomputed search strings.
 * Configures the index with forward tokenization for optimized prefix matching.
 * @param indexData - The parsed index data
 * @returns Configured search index instance
 */
function createSearchIndex(
  indexData: FlexSearch.PrecomputedIndexData
): FlexSearch.Index {
  const searchIndex = new FlexSearch.Index({
    tokenize: 'forward',
    cache: 100,
    resolution: 3
  });

  indexData.searchStrings.forEach((searchString: string, idx: number) => {
    searchIndex.add(idx, searchString);
  });

  return searchIndex;
}

/**
 * Universal address index loader that works in both browser and Node.js environments.
 *
 * In browser environments, fetches the compressed index from the public directory.
 * In Node.js environments, reads the index directly from the filesystem using dynamic imports
 * to avoid bundling Node.js modules in client code.
 *
 * Results are cached for subsequent calls to improve performance.
 *
 * @returns Complete address index bundle with search index and lookup data
 * @throws When index files cannot be loaded, decompressed, or parsed
 */
export async function loadAddressIndex(): Promise<FlexSearch.FlexSearchIndexBundle> {
  if (cachedBundle) {
    return cachedBundle;
  }

  try {
    const gzippedData = await loadGzippedIndexData();
    const indexData = decompressIndexData(gzippedData);
    const searchIndex = createSearchIndex(indexData);
    const addressData = await createAddressLookupMap(indexData);

    cachedBundle = {
      index: searchIndex,
      parcelIds: indexData.parcelIds,
      addressData
    };

    return cachedBundle;
  } catch (error) {
    throw new Error(`Index loading failed: ${error}`);
  }
}

/**
 * Clears the cached address index bundle.
 * Useful for testing or when index data needs to be reloaded.
 */
export function clearAddressIndexCache(): void {
  cachedBundle = null;
}
