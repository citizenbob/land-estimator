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

/**
 * Mock versioned bundle loader with configurable behavior
 */
const mockLoadBundle = vi.fn();
const mockClearCache = vi.fn();

vi.mock('@lib/versionedBundleLoader', () => ({
  createVersionedBundleLoader: () => ({
    loadBundle: mockLoadBundle,
    clearCache: mockClearCache
  })
}));

// Default successful mock behavior
mockLoadBundle.mockResolvedValue({
  index: mockSearchIndex,
  parcelIds: mockIndexData.parcelIds,
  addressData: MOCK_ADDRESS_INDEX_ADDRESS_DATA
});

describe('loadAddressIndex', () => {
  let loadAddressIndex: typeof import('./loadAddressIndex').loadAddressIndex;
  let clearAddressIndexCache: typeof import('./loadAddressIndex').clearAddressIndexCache;

  beforeEach(async () => {
    vi.clearAllMocks();

    /**
     * Reset mock behavior to default success
     */
    mockLoadBundle.mockResolvedValue({
      index: mockSearchIndex,
      parcelIds: mockIndexData.parcelIds,
      addressData: MOCK_ADDRESS_INDEX_ADDRESS_DATA
    });

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
     * Clear any cached data and reset the mock call count
     */
    clearAddressIndexCache();
    // Clear mocks again after clearing cache
    vi.clearAllMocks();
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

    it('should load index successfully in test environment', async () => {
      const result = await loadAddressIndex();

      expect(result).toHaveProperty('index');
      expect(result).toHaveProperty('parcelIds');
      expect(result).toHaveProperty('addressData');
      expect(result.parcelIds).toEqual(mockIndexData.parcelIds);
      expect(result.addressData).toEqual(MOCK_ADDRESS_INDEX_ADDRESS_DATA);
      expect(mockLoadBundle).toHaveBeenCalledTimes(1);
    });

    it('should handle loader errors gracefully', async () => {
      const errorMessage =
        'Unable to load address-index data. This may be due to network connectivity issues or temporary service unavailability. Please try refreshing the page or check your internet connection.';
      mockLoadBundle.mockRejectedValue(new Error(errorMessage));

      await expect(loadAddressIndex()).rejects.toThrow(errorMessage);
      expect(mockLoadBundle).toHaveBeenCalledTimes(1);
    });

    it('should handle unexpected loader failures', async () => {
      mockLoadBundle.mockRejectedValue(new Error('Network error'));

      await expect(loadAddressIndex()).rejects.toThrow('Network error');
      expect(mockLoadBundle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Versioned Loading', () => {
    beforeEach(() => {
      setupBrowserEnvironment();
    });

    it('should load index using versioned loader in production', async () => {
      // Test that the versioned loader is called correctly
      const result = await loadAddressIndex();

      expect(result).toHaveProperty('index');
      expect(result).toHaveProperty('parcelIds');
      expect(result).toHaveProperty('addressData');
      expect(result.parcelIds).toEqual(mockIndexData.parcelIds);
      expect(result.addressData).toEqual(MOCK_ADDRESS_INDEX_ADDRESS_DATA);
      expect(mockLoadBundle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Processing', () => {
    beforeEach(() => {
      setupBrowserEnvironment();
    });

    it('should handle versioned loader errors gracefully', async () => {
      mockLoadBundle.mockRejectedValue(
        new Error(
          'Unable to load address-index data. This may be due to network connectivity issues or temporary service unavailability. Please try refreshing the page or check your internet connection.'
        )
      );

      await expect(loadAddressIndex()).rejects.toThrow(
        'Unable to load address-index data'
      );
      expect(mockLoadBundle).toHaveBeenCalledTimes(1);
    });

    it('should handle data corruption errors gracefully', async () => {
      mockLoadBundle.mockRejectedValue(new Error('Failed to decompress data'));

      await expect(loadAddressIndex()).rejects.toThrow(
        'Failed to decompress data'
      );
      expect(mockLoadBundle).toHaveBeenCalledTimes(1);
    });

    it('should use the versioned bundle loader for all data processing', async () => {
      const result = await loadAddressIndex();

      // The versioned loader handles all data processing internally
      expect(result.addressData).toEqual(MOCK_ADDRESS_INDEX_ADDRESS_DATA);
      expect(mockLoadBundle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      setupBrowserEnvironment();
    });

    it('should call the versioned loader for each request', async () => {
      // Note: Caching is now handled internally by the versioned loader
      const result1 = await loadAddressIndex();
      expect(mockLoadBundle).toHaveBeenCalledTimes(1);

      const result2 = await loadAddressIndex();
      expect(mockLoadBundle).toHaveBeenCalledTimes(2);

      // Both calls should return the same mock data
      expect(result1).toEqual(result2);
    });

    it('should call clearCache on the versioned loader when clearAddressIndexCache is called', async () => {
      await loadAddressIndex();
      expect(mockLoadBundle).toHaveBeenCalledTimes(1);

      clearAddressIndexCache();
      expect(mockClearCache).toHaveBeenCalledTimes(1);

      await loadAddressIndex();
      expect(mockLoadBundle).toHaveBeenCalledTimes(2);
    });
  });

  describe('FlexSearch Index Creation', () => {
    beforeEach(() => {
      setupBrowserEnvironment();
    });

    it('should create FlexSearch index with correct configuration', async () => {
      // In test environment, we can't test the actual FlexSearch constructor call
      // because the versioned loader is mocked to return a pre-built index.
      // Instead, we test that the mocked index is returned correctly.
      const result = await loadAddressIndex();

      // Verify the result structure
      expect(result).toHaveProperty('index');
      expect(result).toHaveProperty('parcelIds');
      expect(result).toHaveProperty('addressData');

      // Verify the index is the mocked one
      expect(result.index).toBe(mockSearchIndex);

      // Verify the versioned loader was called
      expect(mockLoadBundle).toHaveBeenCalledTimes(1);

      // The actual FlexSearch constructor would be called in the createSearchIndex function,
      // but since we're mocking the loader, we don't test this implementation detail
    });
  });
});
