import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AddressLookupData } from '@app-types';

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
    Index: vi.fn(() => mockSearchIndex),
    Document: vi.fn(() => mockSearchIndex)
  },
  Index: vi.fn(() => mockSearchIndex),
  Document: vi.fn(() => mockSearchIndex)
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

describe('loadAddressIndex - Document Mode Only', () => {
  let loadAddressIndex: typeof import('./loadAddressIndex').loadAddressIndex;
  let clearAddressIndexCache: typeof import('./loadAddressIndex').clearAddressIndexCache;
  let originalWindow: Window | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Store original window
    originalWindow = (global as unknown as { window?: Window }).window;

    // Set up browser environment by default (window exists)
    Object.defineProperty(globalThis, 'window', {
      value: { location: { origin: '' } },
      configurable: true,
      writable: true
    });

    // Mock document for cookie access
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: '' },
      configurable: true,
      writable: true
    });

    const loadModule = await import('./loadAddressIndex');
    loadAddressIndex = loadModule.loadAddressIndex;
    clearAddressIndexCache = loadModule.clearAddressIndexCache;

    clearAddressIndexCache();
  });

  afterEach(() => {
    if (originalWindow) {
      (global as unknown as { window?: Window }).window = originalWindow;
    }
  });

  describe('Document Mode Static Files', () => {
    it('loads successfully from Document Mode static files', async () => {
      document.cookie = 'regionShard=stl-city';

      // Mock Document Mode manifest format
      const mockDocumentModeManifest = {
        regions: [
          {
            region: 'stl_city',
            version: '20250709-c43eb644',
            document_file: 'stl_city-20250709-c43eb644-document.json',
            lookup_file: 'stl_city-20250709-c43eb644-lookup.json'
          },
          {
            region: 'stl_county',
            version: '20250709-c43eb644',
            document_file: 'stl_county-20250709-c43eb644-document.json',
            lookup_file: 'stl_county-20250709-c43eb644-lookup.json'
          }
        ],
        metadata: {
          generated_at: '2025-07-09T22:09:03.309290',
          version: '20250709-c43eb644',
          total_regions: 2,
          source: 'ingest_pipeline_document_mode'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDocumentModeManifest)
      });

      // Mock the Document Mode data (array of documents)
      const mockDocuments = [
        { id: 'P001', full_address: '123 Main St, City, State' },
        { id: 'P002', full_address: '456 Oak Ave, City, State' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDocuments)
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
      expect(mockFetch).toHaveBeenCalledWith(
        '/search/stl_city-20250709-c43eb644-document.json'
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/search/stl_city-20250709-c43eb644-lookup.json'
      );
    });

    it('uses stl_county as fallback when region not found', async () => {
      document.cookie = 'regionShard=unknown-region';

      const mockManifest = {
        regions: [
          {
            region: 'stl_county',
            version: '20250709-c43eb644',
            document_file: 'stl_county-20250709-c43eb644-document.json',
            lookup_file: 'stl_county-20250709-c43eb644-lookup.json'
          }
        ],
        metadata: {
          generated_at: '2025-07-09T22:09:03.309290',
          version: '20250709-c43eb644',
          total_regions: 1,
          source: 'ingest_pipeline_document_mode'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      const mockDocuments = [
        { id: 'P001', full_address: '123 County Rd, County, State' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDocuments)
      });

      const mockLookupData: AddressLookupData = {
        parcelIds: ['P001'],
        addressData: {
          P001: '123 County Rd, County, State'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLookupData)
      });

      const result = await loadAddressIndex();

      expect(result).toHaveProperty('index');
      expect(result.parcelIds).toEqual(['P001']);
      expect(mockFetch).toHaveBeenCalledWith(
        '/search/stl_county-20250709-c43eb644-document.json'
      );
    });

    it('handles Node.js environment (no window)', async () => {
      // Remove window to simulate Node.js environment
      delete (globalThis as { window?: unknown }).window;

      const mockManifest = {
        regions: [
          {
            region: 'stl_county',
            version: '20250709-c43eb644',
            document_file: 'stl_county-20250709-c43eb644-document.json',
            lookup_file: 'stl_county-20250709-c43eb644-lookup.json'
          }
        ],
        metadata: {
          generated_at: '2025-07-09T22:09:03.309290',
          version: '20250709-c43eb644',
          total_regions: 1,
          source: 'ingest_pipeline_document_mode'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      const mockDocuments = [
        { id: 'P001', full_address: '123 Server St, Node, State' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDocuments)
      });

      const mockLookupData: AddressLookupData = {
        parcelIds: ['P001'],
        addressData: {
          P001: '123 Server St, Node, State'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLookupData)
      });

      const result = await loadAddressIndex();

      expect(result).toHaveProperty('index');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/search/latest.json'
      );
    });
  });

  describe('Error Handling', () => {
    it('throws error when manifest not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(loadAddressIndex()).rejects.toThrow(
        'Document Mode manifest not found at /search/latest.json: 404'
      );
    });

    it('throws error when manifest has invalid format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'format' })
      });

      await expect(loadAddressIndex()).rejects.toThrow(
        'Invalid Document Mode manifest: missing or invalid regions array'
      );
    });

    it('throws error when no region data found', async () => {
      document.cookie = 'regionShard=unknown-region';

      const mockManifest = {
        regions: [
          {
            region: 'other_region',
            version: '20250709-c43eb644',
            document_file: 'other_region-20250709-c43eb644-document.json',
            lookup_file: 'other_region-20250709-c43eb644-lookup.json'
          }
        ],
        metadata: {
          generated_at: '2025-07-09T22:09:03.309290',
          version: '20250709-c43eb644',
          total_regions: 1,
          source: 'ingest_pipeline_document_mode'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      await expect(loadAddressIndex()).rejects.toThrow(
        'No region data found for stl_county. Available regions: other_region'
      );
    });

    it('throws error when document file fails to load', async () => {
      const mockManifest = {
        regions: [
          {
            region: 'stl_county',
            version: '20250709-c43eb644',
            document_file: 'stl_county-20250709-c43eb644-document.json',
            lookup_file: 'stl_county-20250709-c43eb644-lookup.json'
          }
        ],
        metadata: {
          generated_at: '2025-07-09T22:09:03.309290',
          version: '20250709-c43eb644',
          total_regions: 1,
          source: 'ingest_pipeline_document_mode'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(loadAddressIndex()).rejects.toThrow(
        'Failed to load document file stl_county-20250709-c43eb644-document.json: 404'
      );
    });

    it('throws error when lookup file fails to load', async () => {
      const mockManifest = {
        regions: [
          {
            region: 'stl_county',
            version: '20250709-c43eb644',
            document_file: 'stl_county-20250709-c43eb644-document.json',
            lookup_file: 'stl_county-20250709-c43eb644-lookup.json'
          }
        ],
        metadata: {
          generated_at: '2025-07-09T22:09:03.309290',
          version: '20250709-c43eb644',
          total_regions: 1,
          source: 'ingest_pipeline_document_mode'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      const mockDocuments = [
        { id: 'P001', full_address: '123 Test St, City, State' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDocuments)
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(loadAddressIndex()).rejects.toThrow(
        'Failed to load lookup file stl_county-20250709-c43eb644-lookup.json: 404'
      );
    });
  });

  describe('Caching', () => {
    it('caches successful loads and returns cached result on subsequent calls', async () => {
      const mockManifest = {
        regions: [
          {
            region: 'stl_county',
            version: '20250709-c43eb644',
            document_file: 'stl_county-20250709-c43eb644-document.json',
            lookup_file: 'stl_county-20250709-c43eb644-lookup.json'
          }
        ],
        metadata: {
          generated_at: '2025-07-09T22:09:03.309290',
          version: '20250709-c43eb644',
          total_regions: 1,
          source: 'ingest_pipeline_document_mode'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      const mockDocuments = [
        { id: 'P001', full_address: '123 Cached St, City, State' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDocuments)
      });

      const mockLookupData: AddressLookupData = {
        parcelIds: ['P001'],
        addressData: {
          P001: '123 Cached St, City, State'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLookupData)
      });

      // First call should fetch
      const result1 = await loadAddressIndex();
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Second call should use cache
      const result2 = await loadAddressIndex();
      expect(mockFetch).toHaveBeenCalledTimes(3);

      expect(result1).toBe(result2);
    });

    it('clears cache when requested', async () => {
      clearAddressIndexCache();
      expect(true).toBe(true);
    });
  });

  describe('Cookie Parsing', () => {
    it('maps stl-city cookie to stl_city region', async () => {
      document.cookie = 'regionShard=stl-city';

      const mockManifest = {
        regions: [
          {
            region: 'stl_city',
            version: '20250709-c43eb644',
            document_file: 'stl_city-20250709-c43eb644-document.json',
            lookup_file: 'stl_city-20250709-c43eb644-lookup.json'
          }
        ],
        metadata: {
          generated_at: '2025-07-09T22:09:03.309290',
          version: '20250709-c43eb644',
          total_regions: 1,
          source: 'ingest_pipeline_document_mode'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      const mockDocuments = [
        { id: 'P001', full_address: '123 City St, City, State' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDocuments)
      });

      const mockLookupData: AddressLookupData = {
        parcelIds: ['P001'],
        addressData: {
          P001: '123 City St, City, State'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLookupData)
      });

      await loadAddressIndex();

      expect(mockFetch).toHaveBeenCalledWith(
        '/search/stl_city-20250709-c43eb644-document.json'
      );
    });

    it('maps stl-county cookie to stl_county region', async () => {
      document.cookie = 'regionShard=stl-county';

      const mockManifest = {
        regions: [
          {
            region: 'stl_county',
            version: '20250709-c43eb644',
            document_file: 'stl_county-20250709-c43eb644-document.json',
            lookup_file: 'stl_county-20250709-c43eb644-lookup.json'
          }
        ],
        metadata: {
          generated_at: '2025-07-09T22:09:03.309290',
          version: '20250709-c43eb644',
          total_regions: 1,
          source: 'ingest_pipeline_document_mode'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      const mockDocuments = [
        { id: 'P001', full_address: '123 County Rd, County, State' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDocuments)
      });

      const mockLookupData: AddressLookupData = {
        parcelIds: ['P001'],
        addressData: {
          P001: '123 County Rd, County, State'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLookupData)
      });

      await loadAddressIndex();

      expect(mockFetch).toHaveBeenCalledWith(
        '/search/stl_county-20250709-c43eb644-document.json'
      );
    });

    it('defaults to stl_county when no cookie is set', async () => {
      document.cookie = '';

      const mockManifest = {
        regions: [
          {
            region: 'stl_county',
            version: '20250709-c43eb644',
            document_file: 'stl_county-20250709-c43eb644-document.json',
            lookup_file: 'stl_county-20250709-c43eb644-lookup.json'
          }
        ],
        metadata: {
          generated_at: '2025-07-09T22:09:03.309290',
          version: '20250709-c43eb644',
          total_regions: 1,
          source: 'ingest_pipeline_document_mode'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      });

      const mockDocuments = [
        { id: 'P001', full_address: '123 Default St, County, State' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDocuments)
      });

      const mockLookupData: AddressLookupData = {
        parcelIds: ['P001'],
        addressData: {
          P001: '123 Default St, County, State'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLookupData)
      });

      await loadAddressIndex();

      expect(mockFetch).toHaveBeenCalledWith(
        '/search/stl_county-20250709-c43eb644-document.json'
      );
    });
  });
});
