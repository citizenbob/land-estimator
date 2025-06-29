import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadVersionedBundle,
  clearMemoryCache,
  getCacheStats
} from './versionedBundleLoader';
import { getVersionManifest } from '@services/versionManifest';
import { logError } from '@lib/errorUtils';
import { decompressSync } from 'fflate';
import {
  MOCK_VERSION_MANIFEST,
  MOCK_OPTIMIZED_INDEX,
  EXPECTED_TEST_BUNDLE
} from '@lib/testData';
import { createTestConfig } from '@lib/testUtils';

vi.mock('@services/versionManifest');
vi.mock('@lib/errorUtils');
vi.mock('fflate');

/**
 * Mock fetch for testing CDN requests
 */
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('versionedBundleLoader', () => {
  const testConfig = createTestConfig();

  beforeEach(() => {
    vi.clearAllMocks();
    clearMemoryCache();

    vi.mocked(getVersionManifest).mockResolvedValue(MOCK_VERSION_MANIFEST);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
    });

    vi.mocked(decompressSync).mockReturnValue(
      new TextEncoder().encode(JSON.stringify(MOCK_OPTIMIZED_INDEX))
    );
  });

  afterEach(() => {
    clearMemoryCache();
  });

  describe('loadVersionedBundle', () => {
    it('should load bundle from CDN and cache in memory', async () => {
      const result = await loadVersionedBundle(testConfig);

      expect(result).toEqual(EXPECTED_TEST_BUNDLE);
      expect(getVersionManifest).toHaveBeenCalledOnce();
      expect(mockFetch).toHaveBeenCalledWith(
        `https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/${MOCK_VERSION_MANIFEST.current.files.address_index}`,
        { cache: 'no-store' }
      );
      expect(decompressSync).toHaveBeenCalledOnce();

      const cacheStats = getCacheStats();
      expect(cacheStats.entryCount).toBe(1);
      expect(cacheStats.entries[0].version).toBe(
        MOCK_VERSION_MANIFEST.current.version
      );
    });

    it('should serve from memory cache on subsequent requests', async () => {
      const result1 = await loadVersionedBundle(testConfig);
      expect(result1).toEqual(EXPECTED_TEST_BUNDLE);

      mockFetch.mockClear();

      const result2 = await loadVersionedBundle(testConfig);
      expect(result2).toEqual(EXPECTED_TEST_BUNDLE);
      expect(mockFetch).not.toHaveBeenCalled();

      const cacheStats = getCacheStats();
      expect(cacheStats.entryCount).toBe(1);
    });

    it('should handle CDN fetch failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(loadVersionedBundle(testConfig)).rejects.toThrow(
        'Failed to load address-index: HTTP 404: Not Found'
      );

      expect(logError).toHaveBeenCalledWith(expect.any(Error), {
        baseFilename: 'address-index'
      });
    });

    it('should handle decompression failures', async () => {
      vi.mocked(decompressSync).mockImplementation(() => {
        throw new Error('Decompression failed');
      });

      await expect(loadVersionedBundle(testConfig)).rejects.toThrow(
        'Failed to load address-index'
      );

      expect(logError).toHaveBeenCalledWith(expect.any(Error), {
        baseFilename: 'address-index'
      });
    });

    it('should handle JSON parsing failures', async () => {
      vi.mocked(decompressSync).mockReturnValue(
        new TextEncoder().encode('invalid json')
      );

      await expect(loadVersionedBundle(testConfig)).rejects.toThrow(
        'Failed to load address-index'
      );

      expect(logError).toHaveBeenCalledWith(expect.any(Error), {
        baseFilename: 'address-index'
      });
    });

    it('should handle unknown file types in manifest', async () => {
      const configWithInvalidFile = {
        ...testConfig,
        baseFilename: 'unknown-file'
      };

      await expect(loadVersionedBundle(configWithInvalidFile)).rejects.toThrow(
        'File URL not found for unknown-file'
      );
    });

    it('should map baseFilename correctly to manifest keys', async () => {
      const parcelConfig = {
        ...testConfig,
        baseFilename: 'parcel-metadata'
      };

      await loadVersionedBundle(parcelConfig);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/${MOCK_VERSION_MANIFEST.current.files.parcel_metadata}`,
        { cache: 'no-store' }
      );
    });

    it('should use no-store cache policy for all CDN requests', async () => {
      await loadVersionedBundle(testConfig);

      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        cache: 'no-store'
      });
    });
  });

  describe('memory cache management', () => {
    it('should clear memory cache', async () => {
      await loadVersionedBundle(testConfig);
      expect(getCacheStats().entryCount).toBe(1);

      clearMemoryCache();
      expect(getCacheStats().entryCount).toBe(0);
    });

    it('should provide accurate cache statistics', async () => {
      const initialStats = getCacheStats();
      expect(initialStats.entryCount).toBe(0);
      expect(initialStats.totalSizeBytes).toBe(0);
      expect(initialStats.entries).toEqual([]);

      await loadVersionedBundle(testConfig);

      const statsAfterLoad = getCacheStats();
      expect(statsAfterLoad.entryCount).toBe(1);
      expect(statsAfterLoad.totalSizeBytes).toBe(100);
      expect(statsAfterLoad.entries).toHaveLength(1);
      expect(statsAfterLoad.entries[0]).toMatchObject({
        key: 'bundle:address-index',
        version: MOCK_VERSION_MANIFEST.current.version,
        sizeBytes: 100,
        ageMinutes: 0
      });
    });

    it('should track cache age correctly', async () => {
      const mockNow = vi.spyOn(Date, 'now');
      const startTime = 1000000000000;
      mockNow.mockReturnValue(startTime);

      await loadVersionedBundle(testConfig);

      mockNow.mockReturnValue(startTime + 5 * 60 * 1000);

      const stats = getCacheStats();
      expect(stats.entries[0].ageMinutes).toBe(5);

      mockNow.mockRestore();
    });
  });

  describe('CDN integration', () => {
    it('should log CDN fetch details', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await loadVersionedBundle(testConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/📥 \[CDN\] Fetching address-index:/)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/✅ \[CDN\] Loaded .+MB \(.+ bytes\) from CDN/)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/💾 \[Memory Cache\] Cached address-index/)
      );

      consoleSpy.mockRestore();
    });

    it('should calculate and log data size correctly', async () => {
      const largeMockData = new ArrayBuffer(5 * 1024 * 1024);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(largeMockData)
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await loadVersionedBundle(testConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /✅ \[CDN\] Loaded 5MB \(5242880 bytes\) from CDN/
        )
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error handling and logging', () => {
    it('should log comprehensive error details', async () => {
      const networkError = new Error('Network timeout');
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(loadVersionedBundle(testConfig)).rejects.toThrow();

      expect(logError).toHaveBeenCalledWith(expect.any(Error), {
        baseFilename: 'address-index'
      });
    });

    it('should handle fetch network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(loadVersionedBundle(testConfig)).rejects.toThrow(
        'Failed to load address-index: ECONNREFUSED'
      );
    });

    it('should handle malformed responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.reject(new Error('Invalid response body'))
      });

      await expect(loadVersionedBundle(testConfig)).rejects.toThrow(
        'Failed to load address-index'
      );
    });
  });

  describe('bundle creation', () => {
    it('should handle async bundle creation', async () => {
      const asyncConfig = {
        ...testConfig,
        createBundle: vi.fn().mockResolvedValue(EXPECTED_TEST_BUNDLE)
      };

      const result = await loadVersionedBundle(asyncConfig);

      expect(result).toEqual(EXPECTED_TEST_BUNDLE);
      expect(asyncConfig.createBundle).toHaveBeenCalledWith(
        MOCK_OPTIMIZED_INDEX.data,
        expect.any(Object)
      );
    });

    it('should handle bundle creation errors', async () => {
      const failingConfig = {
        ...testConfig,
        createBundle: vi
          .fn()
          .mockRejectedValue(new Error('Bundle creation failed'))
      };

      await expect(loadVersionedBundle(failingConfig)).rejects.toThrow(
        'Failed to load address-index'
      );
    });
  });

  describe('CDN URL construction', () => {
    it('should construct correct CDN URL from relative manifest paths', async () => {
      // Mock a manifest with relative paths like the real one
      const manifestWithRelativePaths = {
        ...MOCK_VERSION_MANIFEST,
        current: {
          ...MOCK_VERSION_MANIFEST.current,
          files: {
            address_index: 'cdn/address-index-v1.20250629_163501.json.gz',
            parcel_metadata: 'cdn/parcel-metadata-v1.20250629_163501.json.gz',
            parcel_geometry: 'cdn/parcel-geometry-v1.20250629_163501.json.gz'
          }
        }
      };

      vi.mocked(getVersionManifest).mockResolvedValue(
        manifestWithRelativePaths
      );

      await loadVersionedBundle(testConfig);

      // Should construct full CDN URL by prepending base URL
      expect(mockFetch).toHaveBeenCalledWith(
        'https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/cdn/address-index-v1.20250629_163501.json.gz',
        { cache: 'no-store' }
      );
    });

    it('should handle manifest paths that already include full URLs', async () => {
      // Mock a manifest with full URLs (edge case)
      const manifestWithFullUrls = {
        ...MOCK_VERSION_MANIFEST,
        current: {
          ...MOCK_VERSION_MANIFEST.current,
          files: {
            address_index:
              'https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/cdn/address-index-v1.20250629_163501.json.gz',
            parcel_metadata:
              'https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/cdn/parcel-metadata-v1.20250629_163501.json.gz',
            parcel_geometry:
              'https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/cdn/parcel-geometry-v1.20250629_163501.json.gz'
          }
        }
      };

      vi.mocked(getVersionManifest).mockResolvedValue(manifestWithFullUrls);

      await loadVersionedBundle(testConfig);

      // Should use full URL as-is (no double prefixing)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/cdn/address-index-v1.20250629_163501.json.gz',
        { cache: 'no-store' }
      );
    });

    it('should correctly map baseFilename to manifest file keys', async () => {
      const testCases = [
        { baseFilename: 'address-index', expectedKey: 'address_index' },
        { baseFilename: 'parcel-metadata', expectedKey: 'parcel_metadata' },
        { baseFilename: 'parcel-geometry', expectedKey: 'parcel_geometry' }
      ];

      for (const { baseFilename, expectedKey } of testCases) {
        const config = { ...testConfig, baseFilename };
        const expectedUrl = `https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/${
          MOCK_VERSION_MANIFEST.current.files[
            expectedKey as keyof typeof MOCK_VERSION_MANIFEST.current.files
          ]
        }`;

        mockFetch.mockClear();

        await loadVersionedBundle(config);

        expect(mockFetch).toHaveBeenCalledWith(expectedUrl, {
          cache: 'no-store'
        });
      }
    });
  });
});
