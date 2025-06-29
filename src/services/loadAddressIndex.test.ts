import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MOCK_ADDRESS_INDEX_ADDRESS_DATA,
  MOCK_ADDRESS_INDEX_INDEX_DATA
} from '@lib/testData';
import { createMockSearchIndex, setupBrowserEnvironment } from '@lib/testUtils';

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

      // In production, it should call the versioned loader, but in test mode it falls back to local
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

  describe('Versioned Loading', () => {
    beforeEach(() => {
      setupBrowserEnvironment();
    });

    it('should load index using versioned loader in production', async () => {
      // Mock the version manifest fetch
      const mockVersionManifest = {
        current: {
          version: '1.2.3',
          data: {
            address_index:
              'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/address-index-v1.2.3.json.gz',
            parcel_metadata:
              'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/parcel-metadata-v1.2.3.json.gz'
          }
        },
        previous: {
          version: '1.2.2',
          data: {
            address_index:
              'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/address-index-v1.2.2.json.gz',
            parcel_metadata:
              'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/parcel-metadata-v1.2.2.json.gz'
          }
        }
      };

      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      // Mock version manifest response
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('version-manifest.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockVersionManifest)
          } as Response);
        }
        // Mock the actual data file response
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(mockGzippedData.buffer)
        } as Response);
      });

      mockDecompressSync.mockReturnValue(
        new Uint8Array(Buffer.from(JSON.stringify(mockIndexData)))
      );
      const result = await loadAddressIndex();

      expect(result).toHaveProperty('index');
      expect(result).toHaveProperty('parcelIds');
      expect(result).toHaveProperty('addressData');
      expect(result.parcelIds).toEqual(mockIndexData.parcelIds);
      expect(result.addressData).toEqual(MOCK_ADDRESS_INDEX_ADDRESS_DATA);
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
});
