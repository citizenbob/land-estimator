import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MOCK_ADDRESS_INDEX_ADDRESS_DATA,
  MOCK_ADDRESS_INDEX_INDEX_DATA
} from '@lib/testData';
import {
  createMockSearchIndex,
  setupBrowserEnvironment,
  setupNodeEnvironment
} from '@lib/testUtils';

/**
 * Create consistent mock implementations
 */
const mockSearchIndex = createMockSearchIndex();
const mockGzippedData = new Uint8Array([1, 2, 3, 4]);
const mockIndexData = MOCK_ADDRESS_INDEX_INDEX_DATA;

/**
 * Mock FlexSearch constructor
 */
vi.mock('flexsearch', () => ({
  default: {
    Index: vi.fn(() => mockSearchIndex)
  }
}));

/**
 * Mock fflate decompression and compression
 */
const mockDecompressSync = vi.fn();
const mockCompressSync = vi.fn();
vi.mock('fflate', () => ({
  decompressSync: mockDecompressSync,
  compressSync: mockCompressSync
}));

/**
 * Mock address index import
 */
vi.mock('@data/address_index.json', () => ({
  default: MOCK_ADDRESS_INDEX_ADDRESS_DATA
}));

describe('loadAddressIndex', () => {
  let loadAddressIndex: typeof import('./loadAddressIndex').loadAddressIndex;
  let clearAddressIndexCache: typeof import('./loadAddressIndex').clearAddressIndexCache;

  beforeEach(async () => {
    vi.clearAllMocks();

    /**
     * Set up default mock behavior for decompression
     */
    mockDecompressSync.mockReturnValue(
      new Uint8Array(Buffer.from(JSON.stringify(mockIndexData)))
    );

    /**
     * Re-import the module to ensure fresh state
     */
    const loadModule = await import('./loadAddressIndex');
    loadAddressIndex = loadModule.loadAddressIndex;
    clearAddressIndexCache = loadModule.clearAddressIndexCache;

    /**
     * Clear any cached data
     */
    clearAddressIndexCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    /**
     * Clean up global environment
     */
    if ('window' in globalThis) {
      delete (globalThis as Record<string, unknown>).window;
    }
    if ('fetch' in globalThis) {
      delete (globalThis as Record<string, unknown>).fetch;
    }
  });

  describe('Browser Environment', () => {
    beforeEach(() => {
      setupBrowserEnvironment();
    });

    it('should load index via fetch in browser', async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockGzippedData.buffer)
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const result = await loadAddressIndex();

      expect(mockFetch).toHaveBeenCalledWith('/address-index.json.gz');
      expect(result).toHaveProperty('index');
      expect(result).toHaveProperty('parcelIds');
      expect(result).toHaveProperty('addressData');
      expect(result.parcelIds).toEqual(mockIndexData.parcelIds);
      expect(result.addressData).toEqual(MOCK_ADDRESS_INDEX_ADDRESS_DATA);
    });

    it('should throw error when fetch fails in browser', async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      await expect(loadAddressIndex()).rejects.toThrow('Bundle loading failed');
    });

    it('should throw error when fetch throws in browser', async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(loadAddressIndex()).rejects.toThrow('Bundle loading failed');
    });
  });

  describe('Node.js Environment', () => {
    beforeEach(() => {
      setupNodeEnvironment();
    });

    it('should load index from filesystem in Node.js', async () => {
      /**
       * Mock Node.js modules for this test
       */
      const mockReadFileSync = vi.fn().mockReturnValue(mockGzippedData);
      const mockExistsSync = vi.fn().mockReturnValue(true);
      const mockJoin = vi
        .fn()
        .mockReturnValue('/test/project/public/address-index.json.gz');

      const loadModule = await import('./loadAddressIndex');

      loadModule._setTestMockNodeModules({
        fs: {
          readFileSync: mockReadFileSync,
          existsSync: mockExistsSync
        },
        path: {
          join: mockJoin
        }
      });

      try {
        const result = await loadAddressIndex();

        expect(mockJoin).toHaveBeenCalledWith(
          process.cwd(),
          'public',
          'address-index.json.gz'
        );
        expect(mockExistsSync).toHaveBeenCalledWith(
          '/test/project/public/address-index.json.gz'
        );
        expect(mockReadFileSync).toHaveBeenCalledWith(
          '/test/project/public/address-index.json.gz'
        );
        expect(result).toHaveProperty('index');
        expect(result.parcelIds).toEqual(mockIndexData.parcelIds);
        expect(result.addressData).toEqual(MOCK_ADDRESS_INDEX_ADDRESS_DATA);
      } finally {
        loadModule._setTestMockNodeModules(null);
      }
    });

    it('should throw error when file does not exist in Node.js', async () => {
      const mockReadFileSync = vi.fn();
      const mockExistsSync = vi.fn().mockReturnValue(false);
      const mockJoin = vi
        .fn()
        .mockReturnValue('/test/project/public/address-index.json.gz');

      const loadModule = await import('./loadAddressIndex');

      loadModule._setTestMockNodeModules({
        fs: {
          readFileSync: mockReadFileSync,
          existsSync: mockExistsSync
        },
        path: {
          join: mockJoin
        }
      });

      try {
        await expect(loadAddressIndex()).rejects.toThrow(
          'Bundle loading failed'
        );
      } finally {
        loadModule._setTestMockNodeModules(null);
      }
    });

    it('should throw error when filesystem read fails in Node.js', async () => {
      const mockReadFileSync = vi.fn().mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const mockExistsSync = vi.fn().mockReturnValue(true);
      const mockJoin = vi
        .fn()
        .mockReturnValue('/test/project/public/address-index.json.gz');

      const loadModule = await import('./loadAddressIndex');

      loadModule._setTestMockNodeModules({
        fs: {
          readFileSync: mockReadFileSync,
          existsSync: mockExistsSync
        },
        path: {
          join: mockJoin
        }
      });

      try {
        await expect(loadAddressIndex()).rejects.toThrow(
          'Bundle loading failed'
        );
      } finally {
        loadModule._setTestMockNodeModules(null);
      }
    });
  });

  describe('Data Processing', () => {
    beforeEach(() => {
      setupBrowserEnvironment();
    });

    it('should handle decompression errors gracefully', async () => {
      mockDecompressSync.mockImplementation(() => {
        throw new Error('Invalid gzip data');
      });

      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockGzippedData.buffer)
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      await expect(loadAddressIndex()).rejects.toThrow('Bundle loading failed');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockDecompressSync.mockReturnValue(
        new Uint8Array(Buffer.from('invalid json'))
      );

      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockGzippedData.buffer)
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      await expect(loadAddressIndex()).rejects.toThrow('Bundle loading failed');
    });

    it('should use fallback address extraction when import fails', async () => {
      /**
       * Mock failed address index import
       */
      vi.doMock('@data/address_index.json', () => {
        throw new Error('Import failed');
      });

      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockGzippedData.buffer)
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const result = await loadAddressIndex();

      /**
       * Should fall back to extracting addresses from search strings
       */
      expect(result.addressData).toEqual({
        '12345': '123 Main St, St. Louis City, MO',
        '67890': '456 Oak Ave, St. Louis County, MO',
        '11111': '789 Elm Dr, St. Louis City, MO'
      });
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      setupBrowserEnvironment();
    });

    it('should cache the index after first load', async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockGzippedData.buffer)
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const result1 = await loadAddressIndex();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const result2 = await loadAddressIndex();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('should clear cache when clearIndexCache is called', async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockGzippedData.buffer)
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      await loadAddressIndex();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const { clearAddressIndexCache } = await import('./loadAddressIndex');
      clearAddressIndexCache();

      await loadAddressIndex();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('FlexSearch Index Creation', () => {
    beforeEach(() => {
      setupBrowserEnvironment();
    });

    it('should create FlexSearch index with correct configuration', async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockGzippedData.buffer)
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const FlexSearchModule = await import('flexsearch');
      const result = await loadAddressIndex();

      expect(FlexSearchModule.default.Index).toHaveBeenCalledWith({
        tokenize: 'forward',
        cache: 100,
        resolution: 3
      });

      expect(mockSearchIndex.add).toHaveBeenCalledTimes(3);
      expect(mockSearchIndex.add).toHaveBeenCalledWith(
        0,
        mockIndexData.searchStrings[0]
      );
      expect(mockSearchIndex.add).toHaveBeenCalledWith(
        1,
        mockIndexData.searchStrings[1]
      );
      expect(mockSearchIndex.add).toHaveBeenCalledWith(
        2,
        mockIndexData.searchStrings[2]
      );

      expect(result.index).toBe(mockSearchIndex);
    });
  });

  describe('loadAddressIndex - Gzip Error Handling', () => {
    beforeEach(async () => {
      const { clearAddressIndexCache } = await import('./loadAddressIndex');
      clearAddressIndexCache();
      vi.clearAllMocks();
    });

    it('should handle invalid gzip data gracefully and not expose compressed bytes to JSON.parse', async () => {
      const { loadAddressIndex, _setTestMockNodeModules } = await import(
        './loadAddressIndex'
      );

      const invalidGzipData = new Uint8Array([
        0xef, 0xbf, 0xbd, 0x00, 0x01, 0x02
      ]);

      mockDecompressSync.mockImplementation(() => {
        throw new Error('Invalid gzip data');
      });

      _setTestMockNodeModules({
        fs: {
          readFileSync: () => invalidGzipData,
          existsSync: () => true
        },
        path: {
          join: (...paths) => paths.join('/')
        }
      });

      await expect(loadAddressIndex()).rejects.toThrow('Bundle loading failed');

      mockDecompressSync.mockReturnValue(
        new Uint8Array(Buffer.from(JSON.stringify(mockIndexData)))
      );

      _setTestMockNodeModules(null);
    });

    it('should handle empty/corrupted fetch responses in browser gracefully', async () => {
      setupBrowserEnvironment();
      const { loadAddressIndex } = await import('./loadAddressIndex');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
      });

      mockDecompressSync.mockImplementation(() => {
        throw new Error('Empty or corrupted data');
      });

      await expect(loadAddressIndex()).rejects.toThrow('Bundle loading failed');

      mockDecompressSync.mockReturnValue(
        new Uint8Array(Buffer.from(JSON.stringify(mockIndexData)))
      );
    });

    it('should properly decompress valid gzipped data', async () => {
      const { loadAddressIndex, _setTestMockNodeModules } = await import(
        './loadAddressIndex'
      );

      const validJsonData = JSON.stringify(mockIndexData);
      const validGzipData = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);

      mockDecompressSync.mockReturnValue(
        new Uint8Array(Buffer.from(validJsonData))
      );

      _setTestMockNodeModules({
        fs: {
          readFileSync: () => validGzipData,
          existsSync: () => true
        },
        path: {
          join: (...paths) => paths.join('/')
        }
      });

      const result = await loadAddressIndex();

      expect(result).toBeDefined();
      expect(result.index).toBeDefined();
      expect(result.parcelIds).toEqual(mockIndexData.parcelIds);

      _setTestMockNodeModules(null);
    });
  });
});
