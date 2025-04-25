import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAddressLookup } from './useAddressLookup';
import { NominatimApiClient } from '@services/nominatimApi';
import {
  MOCK_NOMINATIM_RESPONSE,
  MOCK_NOMINATIM_RESPONSES,
  TEST_LOCATIONS,
  MOCK_NOMINATIM_ERRORS
} from '@lib/testData';
import { setupConsoleMocks } from '@lib/testUtils';

// Mock the API client instead of fetch directly
vi.mock('@services/nominatimApi', () => ({
  NominatimApiClient: {
    fetchSuggestions: vi.fn()
  }
}));

const mockFetchSuggestions = NominatimApiClient.fetchSuggestions as ReturnType<
  typeof vi.fn
>;

describe('useAddressLookup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetchSuggestions.mockReset();
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

  it('fetches suggestions using API client after debounce and updates state', async () => {
    mockFetchSuggestions.mockResolvedValueOnce([MOCK_NOMINATIM_RESPONSE]);

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange(TEST_LOCATIONS.GOOGLE);
    });

    expect(result.current.isFetching).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
      expect(result.current.isFetching).toBe(false);
    });

    expect(mockFetchSuggestions).toHaveBeenCalledTimes(1);
    expect(mockFetchSuggestions).toHaveBeenCalledWith(TEST_LOCATIONS.GOOGLE);

    expect(result.current.suggestions[0]).toEqual({
      place_id: MOCK_NOMINATIM_RESPONSE.place_id,
      display_name: MOCK_NOMINATIM_RESPONSE.display_name
    });
    expect(result.current.hasFetched).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('clears suggestions and locks state on handleSelect', () => {
    const selectedAddress = TEST_LOCATIONS.APPLE;
    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleSelect(selectedAddress);
    });

    expect(result.current.query).toBe(selectedAddress);
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.locked).toBe(true);
  });

  it('getSuggestionData returns stored raw data', async () => {
    mockFetchSuggestions.mockResolvedValueOnce([MOCK_NOMINATIM_RESPONSES[1]]);

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange(TEST_LOCATIONS.APPLE);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    expect(mockFetchSuggestions).toHaveBeenCalledTimes(1);
    expect(mockFetchSuggestions).toHaveBeenCalledWith(TEST_LOCATIONS.APPLE);

    const placeId = MOCK_NOMINATIM_RESPONSES[1].place_id;
    expect(result.current.suggestions[0].place_id).toBe(placeId);
    const data = result.current.getSuggestionData(placeId);
    expect(data).toEqual(MOCK_NOMINATIM_RESPONSES[1]);
  });

  it('handles API errors', async () => {
    mockFetchSuggestions.mockRejectedValueOnce(
      new Error(MOCK_NOMINATIM_ERRORS.NOT_FOUND.message)
    );

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange(TEST_LOCATIONS.MICROSOFT);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.isFetching).toBe(false);
    });

    expect(mockFetchSuggestions).toHaveBeenCalledTimes(1);
    expect(mockFetchSuggestions).toHaveBeenCalledWith(TEST_LOCATIONS.MICROSOFT);

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.hasFetched).toBe(true);
    expect(result.current.error).toBe(MOCK_NOMINATIM_ERRORS.NOT_FOUND.message);
  });

  it('handles network errors during fetch', async () => {
    mockFetchSuggestions.mockRejectedValueOnce(
      MOCK_NOMINATIM_ERRORS.NETWORK_ERROR
    );

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange(TEST_LOCATIONS.FACEBOOK);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.isFetching).toBe(false);
    });

    expect(mockFetchSuggestions).toHaveBeenCalledTimes(1);
    expect(mockFetchSuggestions).toHaveBeenCalledWith(TEST_LOCATIONS.FACEBOOK);

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.hasFetched).toBe(true);
    expect(result.current.error).toBe(
      MOCK_NOMINATIM_ERRORS.NETWORK_ERROR.message
    );
  });
});
