import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  FlexSearchIndexBundle,
  StaticAddressManifest,
  AddressLookupData
} from '@app-types';

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
      const mockManifest: StaticAddressManifest = {
        version: 'v20250702-abc123',
        timestamp: '2025-07-02T10:00:00.000Z',
        recordCount: 2,
        config: {
          tokenize: 'forward',
          cache: 100,
          resolution: 3
        },
        files: ['address-v20250702-abc123-lookup.json']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      const mockLookupData: AddressLookupData = {
        parcelIds: ['P001', 'P002'],
        searchStrings: ['123 Main St P001', '456 Oak Ave P002'],
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
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            version: 'v1',
            files: ['address-v1-lookup.json']
          })
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

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
      mockFetch.mockRejectedValue(new Error('Static unavailable'));

      mockCDNLoader.mockRejectedValue(new Error('CDN unavailable'));

      await expect(loadAddressIndex()).rejects.toThrow('CDN unavailable');
    });
  });

  describe('Caching', () => {
    it('caches results between calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            version: 'v1',
            files: ['address-v1-lookup.json']
          })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            parcelIds: ['P001'],
            searchStrings: ['Test'],
            addressData: { P001: 'Test' }
          })
      });

      const result1 = await loadAddressIndex();
      const result2 = await loadAddressIndex();

      expect(result1).toBe(result2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('reloads after cache clear', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: 'v1', files: ['lookup.json'] })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            parcelIds: ['P1'],
            searchStrings: ['1'],
            addressData: {}
          })
      });

      const result1 = await loadAddressIndex();

      clearAddressIndexCache();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: 'v2', files: ['lookup.json'] })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            parcelIds: ['P2'],
            searchStrings: ['2'],
            addressData: {}
          })
      });

      const result2 = await loadAddressIndex();

      expect(result1).not.toBe(result2);
    });
  });

  describe('Static File Loading Debugging', () => {
    it('debugs URL parsing for static files', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');

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

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Static loading failed')
      );

      delete (global as unknown as { window?: Window }).window;
    });

    it('tests exact fetch URLs being generated', async () => {
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            version: 'v20250704-787dd7fd',
            files: ['address-v20250704-787dd7fd-lookup.json']
          })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            parcelIds: ['P001'],
            searchStrings: ['Test'],
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
