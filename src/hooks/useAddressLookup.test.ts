import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAddressLookup } from './useAddressLookup';
import {
  TEST_LOCATIONS,
  MOCK_LOCAL_ADDRESSES,
  MOCK_SIMPLE_ADDRESS_RECORD
} from '@lib/testData';
import {
  setupConsoleMocks,
  createMockFetch,
  mockSuccessResponse,
  mockNetworkError,
  createMockApiRecord,
  setupTestTimers,
  cleanupTestTimers
} from '@lib/testUtils';

const createLookupApiResponse = (
  query: string,
  results: Array<{ id: string; display_name: string; region: string }>,
  count = results.length
) => ({
  query,
  results,
  count
});

const performDebouncedApiCall = async (
  result: { current: ReturnType<typeof useAddressLookup> },
  query: string
) => {
  act(() => {
    result.current.handleChange(query);
  });

  expect(result.current.isFetching).toBe(true);

  await act(async () => {
    vi.advanceTimersByTime(600);
  });
};

const mockFetch = createMockFetch();

describe('useAddressLookup', () => {
  beforeEach(() => {
    setupTestTimers();
    mockFetch.mockReset();
    setupConsoleMocks();
  });

  afterEach(() => {
    cleanupTestTimers();
    vi.clearAllMocks();
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

  it('fetches suggestions using local API after debounce and updates state', async () => {
    const mockApiRecord = createMockApiRecord({
      id: MOCK_LOCAL_ADDRESSES[0].id,
      full_address: MOCK_LOCAL_ADDRESSES[0].full_address,
      region: MOCK_LOCAL_ADDRESSES[0].region
    });

    const apiResponse = createLookupApiResponse(TEST_LOCATIONS.FIRST_STREET, [
      mockApiRecord
    ]);

    mockSuccessResponse(mockFetch, apiResponse);

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedApiCall(result, TEST_LOCATIONS.FIRST_STREET);

    await vi.waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
      expect(result.current.isFetching).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/lookup?query=${encodeURIComponent(TEST_LOCATIONS.FIRST_STREET.toLowerCase())}`
    );

    expect(result.current.suggestions[0]).toEqual({
      place_id: mockApiRecord.id,
      display_name: mockApiRecord.display_name
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

  it('getSuggestionData returns stored raw data', async () => {
    const mockApiRecord = createMockApiRecord({
      id: MOCK_LOCAL_ADDRESSES[1].id,
      full_address: MOCK_LOCAL_ADDRESSES[1].full_address,
      region: MOCK_LOCAL_ADDRESSES[1].region
    });

    const lookupResponse = createLookupApiResponse(TEST_LOCATIONS.DUNN_VIEW, [
      mockApiRecord
    ]);

    mockSuccessResponse(mockFetch, lookupResponse);
    mockSuccessResponse(mockFetch, MOCK_LOCAL_ADDRESSES[1]);

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedApiCall(result, TEST_LOCATIONS.DUNN_VIEW);

    await vi.waitFor(
      () => {
        expect(result.current.suggestions).toHaveLength(1);
      },
      { timeout: 1000 }
    );

    const addressId = mockApiRecord.id;
    expect(result.current.suggestions[0].place_id).toBe(addressId);
    const data = await result.current.getSuggestionData(addressId);

    expect(data).toMatchObject({
      id: mockApiRecord.id,
      full_address: mockApiRecord.display_name,
      region: mockApiRecord.region
    });
    expect(data).toHaveProperty('latitude');
    expect(data).toHaveProperty('longitude');
    expect(data).toHaveProperty('calc');
    expect(data).toHaveProperty('calc.landarea');
    expect(data).toHaveProperty('calc.estimated_landscapable_area');
  });

  it('handles API errors', async () => {
    mockNetworkError(mockFetch, 'API error: 500');

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedApiCall(result, TEST_LOCATIONS.FIRST_STREET);

    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.isFetching).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.hasFetched).toBe(true);
    expect(result.current.error).toContain('API error: 500');
  });

  it('handles network errors during fetch', async () => {
    mockNetworkError(mockFetch, 'Network connection failed');

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedApiCall(result, TEST_LOCATIONS.SPRING_GARDEN);

    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.isFetching).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.hasFetched).toBe(true);
    expect(result.current.error).toBe('Network connection failed');
  });

  it('should retrieve enriched metadata for a given suggestion ID', () => {
    const { result } = renderHook(() => useAddressLookup());

    const mockGetSuggestionData = vi
      .fn()
      .mockReturnValue(MOCK_SIMPLE_ADDRESS_RECORD);
    Object.defineProperty(result.current, 'getSuggestionData', {
      value: mockGetSuggestionData
    });

    const data = result.current.getSuggestionData('1');

    expect(mockGetSuggestionData).toBeCalledWith('1');
    expect(data).toEqual(MOCK_SIMPLE_ADDRESS_RECORD);
  });

  it('should return undefined for an unknown suggestion ID', () => {
    const { result } = renderHook(() => useAddressLookup());

    const mockGetSuggestionData = vi.fn().mockReturnValue(undefined);
    Object.defineProperty(result.current, 'getSuggestionData', {
      value: mockGetSuggestionData
    });

    const data = result.current.getSuggestionData('unknown');

    expect(mockGetSuggestionData).toBeCalledWith('unknown');
    expect(data).toBeUndefined();
  });

  it('returns enriched data from parcel metadata', async () => {
    const mockApiRecord = createMockApiRecord({
      id: MOCK_LOCAL_ADDRESSES[0].id,
      full_address: MOCK_LOCAL_ADDRESSES[0].full_address,
      region: MOCK_LOCAL_ADDRESSES[0].region
    });

    const lookupResponse = createLookupApiResponse(
      TEST_LOCATIONS.FIRST_STREET,
      [mockApiRecord]
    );

    mockSuccessResponse(mockFetch, lookupResponse);
    mockSuccessResponse(mockFetch, MOCK_LOCAL_ADDRESSES[0]);

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedApiCall(result, TEST_LOCATIONS.FIRST_STREET);

    await vi.waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    const data = await result.current.getSuggestionData(mockApiRecord.id);

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/parcel-metadata/${mockApiRecord.id}`
    );
    expect(data?.calc.estimated_landscapable_area).toBeGreaterThan(0);
    expect(data?.latitude).toBeGreaterThan(0);
    expect(data?.longitude).toBeGreaterThan(0);
    expect(data?.owner?.name).not.toBe('Unknown');
  });

  it('handles missing parcel metadata gracefully', async () => {
    const mockApiRecord = createMockApiRecord({
      id: 'nonexistent_id_12345',
      full_address: 'Nonexistent Address',
      region: 'Unknown'
    });

    const lookupResponse = createLookupApiResponse('nonexistent address', [
      mockApiRecord
    ]);

    mockSuccessResponse(mockFetch, lookupResponse);

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedApiCall(result, 'nonexistent address');

    await vi.waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    const data = await result.current.getSuggestionData(mockApiRecord.id);

    expect(data?.calc.estimated_landscapable_area).toBe(0);
    expect(data?.latitude).toBe(0);
    expect(data?.longitude).toBe(0);
    expect(data?.owner?.name).toBe('Unknown');
  });

  it('properly joins data from parcel metadata service', async () => {
    const mockApiRecord = createMockApiRecord({
      id: MOCK_LOCAL_ADDRESSES[1].id,
      full_address: MOCK_LOCAL_ADDRESSES[1].full_address,
      region: MOCK_LOCAL_ADDRESSES[1].region
    });

    const lookupResponse = createLookupApiResponse(TEST_LOCATIONS.DUNN_VIEW, [
      mockApiRecord
    ]);

    mockSuccessResponse(mockFetch, lookupResponse);
    mockSuccessResponse(mockFetch, MOCK_LOCAL_ADDRESSES[1]);

    const { result } = renderHook(() => useAddressLookup());

    await performDebouncedApiCall(result, TEST_LOCATIONS.DUNN_VIEW);

    await vi.waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    const data = await result.current.getSuggestionData(mockApiRecord.id);

    expect(data).toMatchObject({
      id: MOCK_LOCAL_ADDRESSES[1].id,
      full_address: mockApiRecord.display_name,
      region: MOCK_LOCAL_ADDRESSES[1].region,
      latitude: MOCK_LOCAL_ADDRESSES[1].latitude,
      longitude: MOCK_LOCAL_ADDRESSES[1].longitude,
      calc: {
        landarea: MOCK_LOCAL_ADDRESSES[1].calc.landarea,
        building_sqft: MOCK_LOCAL_ADDRESSES[1].calc.building_sqft,
        estimated_landscapable_area:
          MOCK_LOCAL_ADDRESSES[1].calc.estimated_landscapable_area
      },
      owner: MOCK_LOCAL_ADDRESSES[1].owner,
      affluence_score: MOCK_LOCAL_ADDRESSES[1].affluence_score,
      source_file: MOCK_LOCAL_ADDRESSES[1].source_file
    });
  });

  it('should clear all state when handleClear is called', () => {
    const { result } = renderHook(() => useAddressLookup());

    // First, set up some state by performing a search and selection
    act(() => {
      result.current.handleChange('test query');
    });

    act(() => {
      result.current.handleSelect('Selected Address');
    });

    // Verify initial state
    expect(result.current.query).toBe('Selected Address');
    expect(result.current.locked).toBe(true);

    // Now clear everything
    act(() => {
      result.current.handleClear();
    });

    // Verify everything is reset
    expect(result.current.query).toBe('');
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.locked).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.hasFetched).toBe(false);
    expect(result.current.error).toBe(null);
  });
});
