import { describe, it, expect, vi, beforeEach } from 'vitest';

// New Shard Manifest type matching our simplified structure
interface ShardManifest {
  regions: Array<{
    region: string;
    version: string;
    document_file: string;
    lookup_file: string;
  }>;
  metadata: {
    generated_at: string;
    version: string;
    total_regions: number;
    source: string;
  };
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

      const mockManifest: ShardManifest = {
        regions: [
          {
            region: 'stl_city',
            version: '1.0.0',
            document_file: 'stl_city-document.json',
            lookup_file: 'stl_city-document.json'
          },
          {
            region: 'stl_county',
            version: '1.0.0',
            document_file: 'stl_county-document.json',
            lookup_file: 'stl_county-document.json'
          }
        ],
        metadata: {
          generated_at: '2025-07-12T11:37:03.373280',
          version: '1.0.0',
          total_regions: 2,
          source: 'Document Mode Pipeline'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      // Mock the document file with raw address data
      const mockAddresses = [
        {
          id: 'P001',
          full_address: '123 Main St, City, State',
          latitude: 38.627,
          longitude: -90.1994,
          region: 'St. Louis City'
        },
        {
          id: 'P002',
          full_address: '456 Oak Ave, City, State',
          latitude: 38.6271,
          longitude: -90.1995,
          region: 'St. Louis City'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAddresses)
      });

      const result = await loadAddressIndex();

      expect(result).toHaveProperty('index');
      expect(result).toHaveProperty('parcelIds');
      expect(result).toHaveProperty('addressData');
      expect(result.parcelIds).toEqual(['P001', 'P002']);
      expect(result.addressData).toEqual({
        P001: '123 Main St, City, State',
        P002: '456 Oak Ave, City, State'
      });
      expect(mockFetch).toHaveBeenCalledWith('/search/latest.json');
    });

    it('handles missing static manifest gracefully', async () => {
      // Manifest fetch fails (simulate 404)
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await expect(loadAddressIndex()).rejects.toThrow(
        'Manifest not found: 404'
      );
      expect(mockFetch).toHaveBeenCalledWith('/search/latest.json');
    });

    it('handles missing lookup file gracefully', async () => {
      document.cookie = 'regionShard=stl-city';

      // Manifest fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            regions: [
              {
                region: 'stl_city',
                version: '1.0.0',
                document_file: 'stl_city-document.json',
                lookup_file: 'stl_city-document.json'
              }
            ],
            metadata: {
              generated_at: '2025-07-12T11:37:03.373280',
              version: '1.0.0',
              total_regions: 1,
              source: 'Document Mode Pipeline'
            }
          })
      });

      // Document file fetch fails
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await expect(loadAddressIndex()).rejects.toThrow(
        'No valid index files for region stl_city'
      );
    });
  });

  describe('Caching', () => {
    it('caches results between calls', async () => {
      document.cookie = 'regionShard=stl-city';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            regions: [
              {
                region: 'stl_city',
                version: '1.0.0',
                document_file: 'stl_city-document.json',
                lookup_file: 'stl_city-document.json'
              }
            ],
            metadata: {
              generated_at: '2025-07-12T11:37:03.373280',
              version: '1.0.0',
              total_regions: 1,
              source: 'Document Mode Pipeline'
            }
          })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'P001',
              full_address: 'Test Address',
              latitude: 38.627,
              longitude: -90.1994,
              region: 'St. Louis City'
            }
          ])
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
            regions: [
              {
                region: 'stl_city',
                version: '1.0.0',
                document_file: 'stl_city-document.json',
                lookup_file: 'stl_city-document.json'
              }
            ],
            metadata: {
              generated_at: '2025-07-12T11:37:03.373280',
              version: '1.0.0',
              total_regions: 1,
              source: 'Document Mode Pipeline'
            }
          })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'P1',
              full_address: 'Test Address 1',
              latitude: 38.627,
              longitude: -90.1994,
              region: 'St. Louis City'
            }
          ])
      });

      const result1 = await loadAddressIndex();

      clearAddressIndexCache();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            regions: [
              {
                region: 'stl_city',
                version: '1.0.0',
                document_file: 'stl_city-document.json',
                lookup_file: 'stl_city-document.json'
              }
            ],
            metadata: {
              generated_at: '2025-07-12T11:37:03.373280',
              version: '1.0.0',
              total_regions: 1,
              source: 'Document Mode Pipeline'
            }
          })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'P2',
              full_address: 'Test Address 2',
              latitude: 38.627,
              longitude: -90.1994,
              region: 'St. Louis City'
            }
          ])
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
            regions: [
              {
                region: 'stl_city',
                version: '1.0.0',
                document_file: 'stl_city-document.json',
                lookup_file: 'stl_city-document.json'
              }
            ],
            metadata: {
              generated_at: '2025-07-12T11:37:03.373280',
              version: '1.0.0',
              total_regions: 1,
              source: 'Document Mode Pipeline'
            }
          })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'P001',
              full_address: 'Test Address',
              latitude: 38.627,
              longitude: -90.1994,
              region: 'St. Louis City'
            }
          ])
      });

      await loadAddressIndex();

      expect(mockFetch).toHaveBeenCalledWith('/search/latest.json');
      expect(mockFetch).toHaveBeenCalledWith('/search/stl_city-document.json');

      delete (global as unknown as { window?: Window }).window;
    });
  });
});
