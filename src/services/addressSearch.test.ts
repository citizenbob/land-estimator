import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchAddresses,
  AddressLookupRecord,
  resetAddressSearchCache
} from './addressSearch';
import { MOCK_ADDRESS_LOOKUP_DATA } from '@lib/testData';

const mockAddressData: AddressLookupRecord[] = MOCK_ADDRESS_LOOKUP_DATA;

vi.mock('./loadAddressIndex', () => ({
  loadAddressIndex: vi.fn()
}));

describe('addressSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAddressSearchCache();
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Browser Environment (Client-side)', () => {
    beforeEach(() => {
      (globalThis as Record<string, unknown>).window = {};
      (globalThis as Record<string, unknown>).fetch = vi.fn();
    });

    it('should call /api/lookup endpoint in browser', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [mockAddressData[0]]
        })
      };
      const mockFetch = (globalThis as Record<string, unknown>)
        .fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue(mockResponse);

      const results = await searchAddresses('riverview');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/lookup?query=riverview'
      );
      expect(results).toEqual([mockAddressData[0]]);
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      const mockFetch = (globalThis as Record<string, unknown>)
        .fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue(mockResponse);

      const results = await searchAddresses('test');

      expect(results).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      const mockFetch = (globalThis as Record<string, unknown>)
        .fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await searchAddresses('test');

      expect(results).toEqual([]);
    });

    it('should encode query parameters properly', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] })
      };
      const mockFetch = (globalThis as Record<string, unknown>)
        .fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue(mockResponse);

      await searchAddresses('123 Main St, St. Louis');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        `/api/lookup?query=${encodeURIComponent('123 Main St, St. Louis')}`
      );
    });

    it('should return empty array for queries shorter than 2 characters', async () => {
      const results = await searchAddresses('a');

      expect(results).toEqual([]);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('should return empty array for empty queries', async () => {
      const results = await searchAddresses('');

      expect(results).toEqual([]);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Server Environment (Server-side)', () => {
    let mockLoadAddressIndex: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      delete (globalThis as Record<string, unknown>).window;

      resetAddressSearchCache();

      const loadModule = await import('./loadAddressIndex');
      mockLoadAddressIndex = vi.mocked(loadModule.loadAddressIndex);
    });

    it('should use FlexSearch index on server', async () => {
      const mockIndex = {
        search: vi.fn().mockReturnValue([0, 1])
      };

      mockLoadAddressIndex.mockResolvedValue({
        index: mockIndex,
        parcelIds: mockAddressData.map((addr) => addr.id),
        addressData: Object.fromEntries(
          mockAddressData.map((addr) => [addr.id, addr.display_name])
        )
      });

      const results = await searchAddresses('riverview');

      expect(mockLoadAddressIndex).toHaveBeenCalled();
      expect(mockIndex.search).toHaveBeenCalledWith('riverview', {
        bool: 'and',
        limit: 10
      });
      expect(results).toHaveLength(2);
    });

    it('should normalize queries before searching', async () => {
      const mockIndex = {
        search: vi.fn().mockReturnValue([0])
      };

      mockLoadAddressIndex.mockResolvedValue({
        index: mockIndex,
        parcelIds: [mockAddressData[0].id],
        addressData: {
          [mockAddressData[0].id]: mockAddressData[0].display_name
        }
      });

      await searchAddresses('RIVERVIEW, MO!');

      expect(mockIndex.search).toHaveBeenCalledWith('riverview mo', {
        bool: 'and',
        limit: 10
      });
    });

    it('should respect limit parameter', async () => {
      const mockIndex = {
        search: vi.fn().mockReturnValue([0, 1, 2, 3])
      };

      mockLoadAddressIndex.mockResolvedValue({
        index: mockIndex,
        parcelIds: mockAddressData.map((addr) => addr.id),
        addressData: Object.fromEntries(
          mockAddressData.map((addr) => [addr.id, addr.display_name])
        )
      });

      const results = await searchAddresses('test', 2);

      expect(mockIndex.search).toHaveBeenCalledWith('test', {
        bool: 'and',
        limit: 2
      });
      expect(results).toHaveLength(2);
    });

    it('should handle server-side errors gracefully', async () => {
      mockLoadAddressIndex.mockRejectedValue(new Error('Index loading failed'));

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const results = await searchAddresses('test');

      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Address search error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should format search results correctly', async () => {
      const mockIndex = {
        search: vi.fn().mockReturnValue([0])
      };

      mockLoadAddressIndex.mockResolvedValue({
        index: mockIndex,
        parcelIds: [mockAddressData[0].id],
        addressData: {
          [mockAddressData[0].id]: mockAddressData[0].display_name
        }
      });

      const results = await searchAddresses('riverview');

      expect(results[0]).toEqual({
        id: mockAddressData[0].id,
        display_name: mockAddressData[0].display_name,
        region: mockAddressData[0].region,
        normalized: expect.any(String)
      });
    });

    it('should cache the address index bundle', async () => {
      const mockIndex = {
        search: vi.fn().mockReturnValue([0])
      };

      mockLoadAddressIndex.mockResolvedValue({
        index: mockIndex,
        parcelIds: [mockAddressData[0].id],
        addressData: {
          [mockAddressData[0].id]: mockAddressData[0].display_name
        }
      });

      await searchAddresses('test1');
      await searchAddresses('test2');

      expect(mockLoadAddressIndex).toHaveBeenCalledTimes(1);
      expect(mockIndex.search).toHaveBeenCalledTimes(2);
    });
  });

  describe('Query Validation', () => {
    it('should trim whitespace from queries', async () => {
      (globalThis as Record<string, unknown>).window = {};
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] })
      };
      (globalThis as Record<string, unknown>).fetch = vi
        .fn()
        .mockResolvedValue(mockResponse);

      await searchAddresses('  test query  ');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/lookup?query=test%20query'
      );
    });

    it('should reject queries shorter than 2 characters after trimming', async () => {
      const results = await searchAddresses('  a  ');

      expect(results).toEqual([]);
    });
  });
});
