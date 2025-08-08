import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAddressLookup } from './useAddressLookup';
import { TEST_LOCATIONS, MOCK_LOCAL_ADDRESSES } from '@lib/testData';
import { createTestSuite } from '@lib/testUtils';
import { searchAddresses } from '@services/addressSearch';

vi.mock('@services/addressSearch', () => ({
  searchAddresses: vi.fn(),
  resetAddressSearchCache: vi.fn()
}));

const performDebouncedSearch = async (
  result: { current: ReturnType<typeof useAddressLookup> },
  query: string
) => {
  act(() => {
    result.current.handleChange(query);
  });

  await act(async () => {
    vi.advanceTimersByTime(200);
  });

  await vi.waitFor(() => {
    expect(result.current.isFetching).toBe(false);
  });
};

describe('useAddressLookup', () => {
  const testSuite = createTestSuite({ consoleMocks: true, timers: true });
  let searchAddressesMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    testSuite.beforeEachSetup();

    searchAddressesMock = vi.mocked(searchAddresses);
    searchAddressesMock.mockClear();
  });

  afterEach(() => {
    testSuite.afterEachCleanup();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAddressLookup());
    expect(result.current.query).toBe('');
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.locked).toBe(false);
    expect(result.current.hasFetched).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches suggestions using client-side search after debounce and updates state', async () => {
    const mockSearchResults = [
      {
        id: MOCK_LOCAL_ADDRESSES[0].id,
        display_name: MOCK_LOCAL_ADDRESSES[0].full_address,
        region: 'St. Louis City',
        normalized: 'test'
      }
    ];

    searchAddressesMock.mockResolvedValue(mockSearchResults);

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedSearch(result, TEST_LOCATIONS.FIRST_STREET);

    await vi.waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
      expect(result.current.isFetching).toBe(false);
    });

    expect(searchAddressesMock).toHaveBeenCalledTimes(1);
    expect(searchAddressesMock).toHaveBeenCalledWith(
      TEST_LOCATIONS.FIRST_STREET,
      10
    );

    expect(result.current.suggestions[0]).toEqual({
      place_id: MOCK_LOCAL_ADDRESSES[0].id,
      display_name: MOCK_LOCAL_ADDRESSES[0].full_address
    });
    expect(result.current.hasFetched).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('clears suggestions and locks state on handleSelect', () => {
    const selectedAddress = TEST_LOCATIONS.FIRST_STREET;
    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleSelect(selectedAddress);
    });

    expect(result.current.query).toBe(selectedAddress);
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.locked).toBe(true);
  });

  it('does not fetch when query is less than 3 characters', async () => {
    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange('ab');
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(searchAddressesMock).not.toHaveBeenCalled();
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isFetching).toBe(false);
  });

  it('handles search errors gracefully', async () => {
    const errorMessage = 'Search failed';
    searchAddressesMock.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedSearch(result, TEST_LOCATIONS.FIRST_STREET);

    await vi.waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(searchAddressesMock).toHaveBeenCalledTimes(1);
    expect(searchAddressesMock).toHaveBeenCalledWith(
      TEST_LOCATIONS.FIRST_STREET,
      10
    );
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.error).toContain('Search failed');
    expect(result.current.hasFetched).toBe(true);
  });

  it('handles network errors gracefully', async () => {
    searchAddressesMock.mockRejectedValue(
      new Error('Network connection failed')
    );

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedSearch(result, TEST_LOCATIONS.FIRST_STREET);

    await vi.waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(searchAddressesMock).toHaveBeenCalledTimes(1);
    expect(searchAddressesMock).toHaveBeenCalledWith(
      TEST_LOCATIONS.FIRST_STREET,
      10
    );
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.error).toContain('Network connection failed');
    expect(result.current.hasFetched).toBe(true);
  });

  it('clears error on new search', async () => {
    searchAddressesMock.mockRejectedValue(new Error('Initial error'));
    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedSearch(result, TEST_LOCATIONS.FIRST_STREET);

    await vi.waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain('Initial error');
    });

    searchAddressesMock.mockResolvedValue([
      {
        id: MOCK_LOCAL_ADDRESSES[0].id,
        display_name: MOCK_LOCAL_ADDRESSES[0].full_address,
        region: 'St. Louis City',
        normalized: 'test'
      }
    ]);

    await performDebouncedSearch(result, TEST_LOCATIONS.DUNN_VIEW);

    await vi.waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.suggestions).toHaveLength(1);
    });
  });

  it('unlocks state on handleChange after being locked', () => {
    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleSelect(TEST_LOCATIONS.FIRST_STREET);
    });

    expect(result.current.locked).toBe(true);

    act(() => {
      result.current.handleChange('new query');
    });

    expect(result.current.locked).toBe(false);
    expect(result.current.query).toBe('new query');
  });

  it('cancels previous search on new query', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    let resolveSecond: (value: unknown) => void = () => {};

    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise((resolve) => {
      resolveSecond = resolve;
    });

    const { result } = renderHook(() => useAddressLookup());

    searchAddressesMock.mockReturnValueOnce(firstPromise);
    act(() => {
      result.current.handleChange(TEST_LOCATIONS.FIRST_STREET);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    searchAddressesMock.mockReturnValueOnce(secondPromise);
    act(() => {
      result.current.handleChange(TEST_LOCATIONS.DUNN_VIEW);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    resolveFirst([
      {
        id: 'old-result',
        display_name: 'Old Result',
        region: 'Test',
        normalized: 'old result'
      }
    ]);

    resolveSecond([
      {
        id: MOCK_LOCAL_ADDRESSES[1].id,
        display_name: MOCK_LOCAL_ADDRESSES[1].full_address,
        region: 'St. Louis County',
        normalized: 'test'
      }
    ]);

    await vi.waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
      expect(result.current.suggestions[0].place_id).toBe(
        MOCK_LOCAL_ADDRESSES[1].id
      );
    });
  });

  it('returns proper output types', async () => {
    const mockResults = [
      {
        id: MOCK_LOCAL_ADDRESSES[0].id,
        display_name: MOCK_LOCAL_ADDRESSES[0].full_address,
        region: 'St. Louis City',
        normalized: 'test'
      }
    ];

    searchAddressesMock.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedSearch(result, TEST_LOCATIONS.FIRST_STREET);

    await vi.waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    const suggestion = result.current.suggestions[0];
    expect(typeof suggestion.place_id).toBe('string');
    expect(typeof suggestion.display_name).toBe('string');
  });

  it('properly formats query for search call', async () => {
    const queryWithSpaces = 'FIRST STREET';
    const expectedFormattedQuery = 'FIRST STREET';

    const mockResults = [
      {
        id: MOCK_LOCAL_ADDRESSES[0].id,
        display_name: MOCK_LOCAL_ADDRESSES[0].full_address,
        region: 'St. Louis City',
        normalized: 'test'
      }
    ];

    searchAddressesMock.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedSearch(result, queryWithSpaces);

    await vi.waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    expect(searchAddressesMock).toHaveBeenCalledWith(
      expectedFormattedQuery,
      10
    );
  });

  it('handles empty search results', async () => {
    searchAddressesMock.mockResolvedValue([]);

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedSearch(result, TEST_LOCATIONS.FIRST_STREET);

    await vi.waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.hasFetched).toBe(true);
  });
});
