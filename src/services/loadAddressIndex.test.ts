import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createTestSuite,
  mockJsonResponse,
  mockErrorResponse
} from '@lib/testUtils';

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

// Mock data constants
const mockManifestData = {
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

const mockCountyAddresses = [
  {
    id: 'P002',
    full_address: 'County Test Address',
    latitude: 38.627,
    longitude: -90.1994,
    region: 'St. Louis County'
  }
];

/**
 * Mock fetch for static files
 */
import { createMockFetch } from '@lib/testUtils';
const mockFetch = createMockFetch();

describe('loadAddressIndex', () => {
  const testSuite = createTestSuite();
  let loadAddressIndex: typeof import('./loadAddressIndex').loadAddressIndex;
  let clearAddressIndexCache: typeof import('./loadAddressIndex').clearAddressIndexCache;
  let originalWindow: Window | undefined;

  beforeEach(async () => {
    testSuite.beforeEachSetup();

    originalWindow = (global as unknown as { window?: Window }).window;

    // Set up fetch mock
    global.fetch = mockFetch;

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
    testSuite.afterEachCleanup();

    if (originalWindow !== undefined) {
      (global as unknown as { window?: Window }).window = originalWindow;
    } else {
      delete (global as unknown as { window?: Window }).window;
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

      mockJsonResponse(mockFetch, mockManifest);

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

      mockJsonResponse(mockFetch, mockAddresses);

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
      mockErrorResponse(mockFetch, 404);

      await expect(loadAddressIndex()).rejects.toThrow(
        'Manifest not found: 404'
      );
      expect(mockFetch).toHaveBeenCalledWith('/search/latest.json');
    });

    it('handles missing lookup file gracefully', async () => {
      document.cookie = 'regionShard=stl-city';

      // Manifest fetch succeeds with both regions
      mockJsonResponse(mockFetch, mockManifestData);

      // County document file fetch fails (loads first)
      mockErrorResponse(mockFetch, 404);

      await expect(loadAddressIndex()).rejects.toThrow(
        'Failed to load county region'
      );
    });
  });

  describe('Caching', () => {
    it('caches results between calls', async () => {
      document.cookie = 'regionShard=stl-city';

      // Manifest fetch with both regions
      mockJsonResponse(mockFetch, mockManifestData);

      // County data fetch (loads first)
      mockJsonResponse(mockFetch, mockCountyAddresses);

      const result1 = await loadAddressIndex();
      const result2 = await loadAddressIndex();

      expect(result1).toBe(result2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('reloads after cache clear', async () => {
      document.cookie = 'regionShard=stl-city';

      // First load - manifest with both regions
      mockJsonResponse(mockFetch, mockManifestData);
      // First load - county data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'P1',
              full_address: 'Test Address 1',
              latitude: 38.627,
              longitude: -90.1994,
              region: 'St. Louis County'
            }
          ])
      });

      const result1 = await loadAddressIndex();

      clearAddressIndexCache();

      // Second load - manifest again
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
          })
      });
      // Second load - county data again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'P2',
              full_address: 'Test Address 2',
              latitude: 38.627,
              longitude: -90.1994,
              region: 'St. Louis County'
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

      // Manifest with both regions
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
          })
      });

      // County data (loads first)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'P002',
              full_address: 'County Address',
              latitude: 38.627,
              longitude: -90.1994,
              region: 'St. Louis County'
            }
          ])
      });

      // City data (loads second)
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
      expect(mockFetch).toHaveBeenCalledWith(
        '/search/stl_county-document.json'
      );
      // Note: City data loads in background with setTimeout, so it may not be called in tests

      delete (global as unknown as { window?: Window }).window;
    });
  });
});
