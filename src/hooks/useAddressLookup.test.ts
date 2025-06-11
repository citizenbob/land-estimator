import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAddressLookup } from './useAddressLookup';
import {
  TEST_LOCATIONS,
  MOCK_LOCAL_ADDRESSES,
  MOCK_SIMPLE_ADDRESS_RECORD
} from '@lib/testData';
import { setupConsoleMocks } from '@lib/testUtils';
import { searchAddresses } from '@services/addressSearch';
import { LocalAddressRecord } from '@typez/localAddressTypes';

vi.mock('@services/addressSearch', () => ({
  searchAddresses: vi.fn()
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockData: Record<string, LocalAddressRecord> = {
  '1': MOCK_SIMPLE_ADDRESS_RECORD
};

describe('useAddressLookup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(searchAddresses).mockReset();
    mockFetch.mockReset();
    setupConsoleMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    const mockApiRecord = {
      id: MOCK_LOCAL_ADDRESSES[0].id,
      display_name: MOCK_LOCAL_ADDRESSES[0].full_address,
      region: MOCK_LOCAL_ADDRESSES[0].region,
      normalized: MOCK_LOCAL_ADDRESSES[0].full_address.toLowerCase()
    };

    vi.mocked(searchAddresses).mockResolvedValueOnce([mockApiRecord]);

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange(TEST_LOCATIONS.FIRST_STREET);
    });

    expect(result.current.isFetching).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
      expect(result.current.isFetching).toBe(false);
    });

    expect(searchAddresses).toHaveBeenCalledTimes(1);
    expect(searchAddresses).toHaveBeenCalledWith(
      TEST_LOCATIONS.FIRST_STREET,
      10
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
    const mockApiRecord = {
      id: MOCK_LOCAL_ADDRESSES[1].id,
      display_name: MOCK_LOCAL_ADDRESSES[1].full_address,
      region: MOCK_LOCAL_ADDRESSES[1].region,
      normalized: MOCK_LOCAL_ADDRESSES[1].full_address.toLowerCase()
    };

    vi.mocked(searchAddresses).mockResolvedValueOnce([mockApiRecord]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_LOCAL_ADDRESSES[1]
    });

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange(TEST_LOCATIONS.DUNN_VIEW);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

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
    vi.mocked(searchAddresses).mockRejectedValueOnce(
      new Error('API error: 500')
    );

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange(TEST_LOCATIONS.FIRST_STREET);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.isFetching).toBe(false);
    });

    expect(searchAddresses).toHaveBeenCalledTimes(1);
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.hasFetched).toBe(true);
    expect(result.current.error).toContain('API error: 500');
  });

  it('handles network errors during fetch', async () => {
    vi.mocked(searchAddresses).mockRejectedValueOnce(
      new Error('Network connection failed')
    );

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange(TEST_LOCATIONS.SPRING_GARDEN);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.isFetching).toBe(false);
    });

    expect(searchAddresses).toHaveBeenCalledTimes(1);
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.hasFetched).toBe(true);
    expect(result.current.error).toBe('Network connection failed');
  });

  it('should retrieve enriched metadata for a given suggestion ID', () => {
    const { result } = renderHook(() => useAddressLookup());

    const mockGetSuggestionData = vi.fn().mockReturnValue(mockData['1']);
    Object.defineProperty(result.current, 'getSuggestionData', {
      value: mockGetSuggestionData
    });

    const data = result.current.getSuggestionData('1');

    expect(mockGetSuggestionData).toBeCalledWith('1');
    expect(data).toEqual(mockData['1']);
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
    const mockApiRecord = {
      id: MOCK_LOCAL_ADDRESSES[0].id,
      display_name: MOCK_LOCAL_ADDRESSES[0].full_address,
      region: MOCK_LOCAL_ADDRESSES[0].region,
      normalized: MOCK_LOCAL_ADDRESSES[0].full_address.toLowerCase()
    };

    vi.mocked(searchAddresses).mockResolvedValueOnce([mockApiRecord]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_LOCAL_ADDRESSES[0]
    });

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange(TEST_LOCATIONS.FIRST_STREET);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

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
    const mockApiRecord = {
      id: 'nonexistent_id_12345',
      display_name: 'Nonexistent Address',
      region: 'Unknown',
      normalized: 'nonexistent address'
    };

    vi.mocked(searchAddresses).mockResolvedValueOnce([mockApiRecord]);

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange('nonexistent address');
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

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
    const mockApiRecord = {
      id: MOCK_LOCAL_ADDRESSES[1].id,
      display_name: MOCK_LOCAL_ADDRESSES[1].full_address,
      region: MOCK_LOCAL_ADDRESSES[1].region,
      normalized: MOCK_LOCAL_ADDRESSES[1].full_address.toLowerCase()
    };

    vi.mocked(searchAddresses).mockResolvedValueOnce([mockApiRecord]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_LOCAL_ADDRESSES[1]
    });

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange(TEST_LOCATIONS.DUNN_VIEW);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

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
});
