import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchAddresses,
  AddressLookupRecord,
  resetAddressSearchCache
} from './addressSearch';
import { MOCK_ADDRESS_LOOKUP_DATA } from '@lib/testData';
import { setupConsoleMocks } from '@lib/testUtils';

const mockAddressData: AddressLookupRecord[] = MOCK_ADDRESS_LOOKUP_DATA;

vi.mock('./loadAddressIndex', () => ({
  loadAddressIndex: vi.fn()
}));

vi.mock('@lib/errorUtils', () => ({
  logError: vi.fn()
}));

describe('addressSearch - Client-Only Fast Rebuild Strategy', () => {
  let mockLoadAddressIndex: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetAddressSearchCache();
    setupConsoleMocks();

    // Mock the loadAddressIndex module
    const loadModule = await import('./loadAddressIndex');
    mockLoadAddressIndex = vi.mocked(loadModule.loadAddressIndex);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('FlexSearch Index Operations', () => {
    it('should use FlexSearch index for client-side search', async () => {
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

    it('should handle index loading errors gracefully', async () => {
      const { logError } = await import('@lib/errorUtils');
      const consoleSpy = vi.mocked(logError);

      mockLoadAddressIndex.mockRejectedValue(new Error('Index loading failed'));

      const results = await searchAddresses('test');

      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error), {
        operation: 'client_address_search',
        query: 'test',
        limit: 10
      });
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

      await searchAddresses('  test!@# query  ');

      expect(mockIndex.search).toHaveBeenCalledWith('test query', {
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
    it('should return empty array for queries shorter than 2 characters', async () => {
      const results = await searchAddresses('a');

      expect(results).toEqual([]);
      expect(mockLoadAddressIndex).not.toHaveBeenCalled();
    });

    it('should return empty array for empty queries', async () => {
      const results = await searchAddresses('');

      expect(results).toEqual([]);
      expect(mockLoadAddressIndex).not.toHaveBeenCalled();
    });

    it('should trim whitespace from queries', async () => {
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

      await searchAddresses('  test query  ');

      expect(mockIndex.search).toHaveBeenCalledWith('test query', {
        bool: 'and',
        limit: 10
      });
    });

    it('should reject queries shorter than 2 characters after trimming', async () => {
      const results = await searchAddresses('  a  ');

      expect(results).toEqual([]);
      expect(mockLoadAddressIndex).not.toHaveBeenCalled();
    });

    it('should normalize Missouri-specific queries', async () => {
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
  });
});
