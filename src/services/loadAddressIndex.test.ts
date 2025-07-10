import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FlexSearchIndexBundle, AddressLookupData } from '@app-types';

// Regional Shard Manifest type matching our build output
interface RegionalShardManifest {
  version: string;
  buildTime: string;
  regions: Record<
    string,
    {
      region: string;
      version: string;
      hash: string;
      files: string[];
      lookup: string;
      addressCount: number;
      buildTime: string;
    }
  >;
  totalAddresses: number;
}

/**
 * Mock FlexSearch to return a search index that works
 */
const mockSearchIndex = {
  search: vi.fn(() => []),
  add: vi.fn(),
  import: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  export: vi.fn()
};

vi.mock('flexsearch', () => ({
  default: {
    Index: vi.fn(() => mockSearchIndex)
  },
  Index: vi.fn(() => mockSearchIndex)
}));

/**
 * Mock the CDN loader (fallback)
 */
const mockCDNLoader = vi.fn();
vi.mock('@workers/versionedBundleLoader', () => ({
  loadVersionedBundle: mockCDNLoader,
  clearMemoryCache: vi.fn()
}));

vi.mock('@lib/logger', () => ({
  devLog: vi.fn(),
  logError: vi.fn()
}));

/**
 * Mock fetch for static files
 */
import { createMockFetch } from '@lib/testUtils';
const mockFetch = createMockFetch();

describe('loadAddressIndex', () => {
  let loadAddressIndex: typeof import('./loadAddressIndex').loadAddressIndex;
  let clearAddressIndexCache: typeof import('./loadAddressIndex').clearAddressIndexCache;
  let originalWindow: Window | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();

    originalWindow = (global as unknown as { window?: Window }).window;

    Object.defineProperty(globalThis, 'window', {
      value: { location: { origin: 'http://localhost:3000' } },
      configurable: true
    });

    const loadModule = await import('./loadAddressIndex');
    loadAddressIndex = loadModule.loadAddressIndex;
    clearAddressIndexCache = loadModule.clearAddressIndexCache;

    clearAddressIndexCache();
  });

  afterEach(() => {
    if (originalWindow) {
      (global as unknown as { window?: Window }).window = originalWindow;
    } else {
      delete (global as unknown as { window?: unknown }).window;
    }
  });

  describe('Static Files (Primary Path)', () => {
    it('loads successfully from static files', async () => {
      document.cookie = 'regionShard=stl-city';

      const mockManifest: RegionalShardManifest = {
        version: '20250109',
        buildTime: '2025-07-09T05:26:32.946Z',
        regions: {
          stl_city: {
            region: 'stl_city',
            version: '20250109',
            hash: 'ab0e5e98',
            files: [
              'stl_city-20250109-ab0e5e98-1.reg.json',
              'stl_city-20250109-ab0e5e98-1.map.json',
              'stl_city-20250109-ab0e5e98-lookup.json'
            ],
            lookup: 'stl_city-20250109-ab0e5e98-lookup.json',
            addressCount: 500,
            buildTime: '2025-07-09T05:26:32.946Z'
          },
          stl_county: {
            region: 'stl_county',
            version: '20250109',
            hash: 'cd1f6f89',
            files: [
              'stl_county-20250109-cd1f6f89-1.reg.json',
              'stl_county-20250109-cd1f6f89-1.map.json',
              'stl_county-20250109-cd1f6f89-lookup.json'
            ],
            lookup: 'stl_county-20250109-cd1f6f89-lookup.json',
            addressCount: 494,
            buildTime: '2025-07-09T05:26:32.946Z'
          }
        },
        totalAddresses: 994
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      // Mock the FlexSearch export files (.reg and .map)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{}')
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{}')
      });

      const mockLookupData: AddressLookupData = {
        parcelIds: ['P001', 'P002'],
        addressData: {
          P001: '123 Main St, City, State',
          P002: '456 Oak Ave, City, State'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLookupData)
      });

      const result = await loadAddressIndex();

      expect(result).toHaveProperty('index');
      expect(result).toHaveProperty('parcelIds');
      expect(result).toHaveProperty('addressData');
      expect(result.parcelIds).toEqual(['P001', 'P002']);
      expect(result.addressData).toEqual(mockLookupData.addressData);
      expect(mockFetch).toHaveBeenCalledWith('/search/latest.json');
      expect(mockCDNLoader).not.toHaveBeenCalled();
    });

    it('handles missing static manifest by falling back to CDN', async () => {
      document.cookie = 'regionShard=stl-city';

      // Manifest fetch fails (simulate 404)
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const mockCDNResult: FlexSearchIndexBundle = {
        index: mockSearchIndex,
        parcelIds: ['P001'],
        addressData: { P001: 'Test Address from CDN' }
      };
      mockCDNLoader.mockResolvedValueOnce(mockCDNResult);

      const result = await loadAddressIndex();

      expect(result).toHaveProperty('index');
      expect(result).toHaveProperty('parcelIds');
      expect(result).toHaveProperty('addressData');
      expect(result.parcelIds).toEqual(['P001']);
      expect(result.addressData).toEqual({ P001: 'Test Address from CDN' });
      expect(mockFetch).toHaveBeenCalledWith('/search/latest.json');
      expect(mockCDNLoader).toHaveBeenCalled();
    });

    it('handles missing lookup file by falling back to CDN', async () => {
      document.cookie = 'regionShard=stl-city';

      // Manifest fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            version: '20250109',
            buildTime: '2025-07-09T05:26:32.946Z',
            regions: {
              stl_city: {
                region: 'stl_city',
                version: '20250109',
                hash: 'ab0e5e98',
                files: [
                  'stl_city-20250109-ab0e5e98-1.reg.json',
                  'stl_city-20250109-ab0e5e98-1.map.json',
                  'stl_city-20250109-ab0e5e98-lookup.json'
                ],
                lookup: 'stl_city-20250109-ab0e5e98-lookup.json',
                addressCount: 500,
                buildTime: '2025-07-09T05:26:32.946Z'
              },
              stl_county: {
                region: 'stl_county',
                version: '20250109',
                hash: 'cd1f6f89',
                files: [
                  'stl_county-20250109-cd1f6f89-1.reg.json',
                  'stl_county-20250109-cd1f6f89-1.map.json',
                  'stl_county-20250109-cd1f6f89-lookup.json'
                ],
                lookup: 'stl_county-20250109-cd1f6f89-lookup.json',
                addressCount: 494,
                buildTime: '2025-07-09T05:26:32.946Z'
              }
            },
            totalAddresses: 994
          })
      });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      mockCDNLoader.mockResolvedValueOnce({
        index: mockSearchIndex,
        parcelIds: ['P001'],
        addressData: { P001: 'Test Address' }
      });

      const result = await loadAddressIndex();

      expect(result).toHaveProperty('index');
      expect(mockCDNLoader).toHaveBeenCalled();
    });
  });

  describe('CDN Fallback', () => {
    it('loads from CDN when static files fail', async () => {
      document.cookie = 'regionShard=stl-city';

      mockFetch.mockRejectedValue(new Error('Static files unavailable'));
      mockCDNLoader.mockResolvedValueOnce({
        index: mockSearchIndex,
        parcelIds: ['P001', 'P002'],
        addressData: { P001: 'Address 1', P002: 'Address 2' }
      });

      const result = await loadAddressIndex();

      expect(result).toHaveProperty('index');
      expect(result.parcelIds).toEqual(['P001', 'P002']);
      expect(mockCDNLoader).toHaveBeenCalled();
    });

    it('throws error when both static and CDN fail', async () => {
      document.cookie = 'regionShard=stl-city';

      mockFetch.mockRejectedValue(new Error('Static unavailable'));
      mockCDNLoader.mockRejectedValue(new Error('CDN unavailable'));

      await expect(loadAddressIndex()).rejects.toThrow('CDN unavailable');
    });
  });

  describe('Caching', () => {
    it('caches results between calls', async () => {
      document.cookie = 'regionShard=stl-city';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            version: '20250109',
            buildTime: '2025-07-09T05:26:32.946Z',
            regions: {
              stl_city: {
                region: 'stl_city',
                version: '20250109',
                hash: 'ab0e5e98',
                files: ['stl_city-20250109-ab0e5e98-lookup.json'],
                lookup: 'stl_city-20250109-ab0e5e98-lookup.json',
                addressCount: 1,
                buildTime: '2025-07-09T05:26:32.946Z'
              },
              stl_county: {
                region: 'stl_county',
                version: '20250109',
                hash: 'def456',
                files: [],
                lookup: '',
                addressCount: 1,
                buildTime: '2025-07-09T05:26:32.946Z'
              }
            },
            totalAddresses: 2
          })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            parcelIds: ['P001'],
            addressData: { P001: 'Test' }
          })
      });

      const result1 = await loadAddressIndex();
      const result2 = await loadAddressIndex();

      expect(result1).toBe(result2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('reloads after cache clear', async () => {
      document.cookie = 'regionShard=stl-city';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            version: '20250109-v1',
            buildTime: '2025-07-09T05:26:32.946Z',
            regions: {
              stl_city: {
                region: 'stl_city',
                version: '20250109-v1',
                hash: 'hash1',
                files: ['lookup.json'],
                lookup: 'lookup.json',
                addressCount: 1,
                buildTime: '2025-07-09T05:26:32.946Z'
              },
              stl_county: {
                region: 'stl_county',
                version: '20250109-v1',
                hash: 'hash1',
                files: ['lookup.json'],
                lookup: 'lookup.json',
                addressCount: 1,
                buildTime: '2025-07-09T05:26:32.946Z'
              }
            },
            totalAddresses: 2
          })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            parcelIds: ['P1'],
            addressData: {}
          })
      });

      const result1 = await loadAddressIndex();

      clearAddressIndexCache();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            version: '20250109-v2',
            buildTime: '2025-07-09T05:26:32.946Z',
            regions: {
              stl_city: {
                region: 'stl_city',
                version: '20250109-v2',
                hash: 'hash2',
                files: ['lookup.json'],
                lookup: 'lookup.json',
                addressCount: 1,
                buildTime: '2025-07-09T05:26:32.946Z'
              },
              stl_county: {
                region: 'stl_county',
                version: '20250109-v2',
                hash: 'hash2',
                files: ['lookup.json'],
                lookup: 'lookup.json',
                addressCount: 1,
                buildTime: '2025-07-09T05:26:32.946Z'
              }
            },
            totalAddresses: 2
          })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            parcelIds: ['P2'],
            addressData: {}
          })
      });

      const result2 = await loadAddressIndex();

      expect(result1).not.toBe(result2);
    });
  });

  describe('Static File Loading Debugging', () => {
    it('debugs URL parsing for static files', async () => {
      document.cookie = 'regionShard=stl-city';

      const { logError } = await import('@lib/logger');
      const logErrorSpy = vi.mocked(logError);

      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      });

      mockFetch.mockRejectedValueOnce(
        new TypeError('Failed to parse URL from /search/latest.json')
      );

      // Make CDN also fail to ensure static loading error is logged
      mockCDNLoader.mockRejectedValueOnce(new Error('CDN unavailable'));

      try {
        await loadAddressIndex();
      } catch {
        // Expected to fail
      }

      expect(logErrorSpy).toHaveBeenCalledWith(
        '❌ Static index loading failed:',
        expect.any(Error)
      );

      delete (global as unknown as { window?: Window }).window;
    });

    it('tests exact fetch URLs being generated', async () => {
      document.cookie = 'regionShard=stl-city';

      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            version: '20250704-787dd7fd',
            buildTime: '2025-07-04T10:00:00.000Z',
            regions: {
              stl_city: {
                region: 'stl_city',
                version: '20250704-787dd7fd',
                hash: '787dd7fd',
                files: ['address-v20250704-787dd7fd-lookup.json'],
                lookup: 'address-v20250704-787dd7fd-lookup.json',
                addressCount: 1,
                buildTime: '2025-07-04T10:00:00.000Z'
              },
              stl_county: {
                region: 'stl_county',
                version: '20250704-787dd7fd',
                hash: '787dd7fd',
                files: ['address-v20250704-787dd7fd-lookup.json'],
                lookup: 'address-v20250704-787dd7fd-lookup.json',
                addressCount: 1,
                buildTime: '2025-07-04T10:00:00.000Z'
              }
            },
            totalAddresses: 2
          })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            parcelIds: ['P001'],
            addressData: { P001: 'Test' }
          })
      });

      await loadAddressIndex();

      expect(mockFetch).toHaveBeenCalledWith('/search/latest.json');
      expect(mockFetch).toHaveBeenCalledWith(
        '/search/address-v20250704-787dd7fd-lookup.json'
      );

      delete (global as unknown as { window?: Window }).window;
    });
  });
});
