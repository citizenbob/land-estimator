import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAddressLookup } from './useAddressLookup';
import { NominatimResponse } from '@typez/addressMatchTypes';

describe('useAddressLookup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(global, 'fetch');
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

  it('fetches suggestions after debounce and updates state', async () => {
    const mockData: NominatimResponse[] = [
      {
        place_id: 1,
        licence: 'licence',
        osm_type: 'type',
        osm_id: 10,
        lat: '10',
        lon: '20',
        place_rank: 0,
        importance: 0,
        addresstype: 'addr',
        name: 'name',
        display_name: 'Display A',
        boundingbox: []
      }
    ];

    (global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    const { result } = renderHook(() => useAddressLookup());

    act(() => {
      result.current.handleChange('test');
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
      vi.useRealTimers();
    });

    await vi.waitFor(
      () => {
        expect(result.current.suggestions).toHaveLength(1);
      },
      { timeout: 1000 }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/nominatim?type=suggestions&query=test'
    );
    expect(result.current.suggestions[0]).toEqual({
      place_id: 1,
      display_name: 'Display A'
    });
    expect(result.current.hasFetched).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('clears suggestions and locks state on handleSelect', () => {
    const { result } = renderHook(() => useAddressLookup());
    act(() => {
      result.current.handleSelect('chosen');
    });
    expect(result.current.query).toBe('chosen');
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.locked).toBe(true);
  });

  it('getSuggestionData returns stored raw data', async () => {
    const mockData: NominatimResponse[] = [
      {
        place_id: 42,
        licence: '',
        osm_type: '',
        osm_id: 0,
        lat: '0',
        lon: '0',
        place_rank: 0,
        importance: 0,
        addresstype: '',
        name: '',
        display_name: 'Display B',
        boundingbox: []
      }
    ];

    (global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    const { result } = renderHook(() => useAddressLookup());

    // Change the query
    act(() => {
      result.current.handleChange('foo');
    });

    // Advance timer to trigger fetch
    await act(async () => {
      vi.advanceTimersByTime(600);
      // Switch to real timers
      vi.useRealTimers();
    });

    // Wait for the suggestions to be populated
    await vi.waitFor(
      () => {
        expect(result.current.suggestions).toHaveLength(1);
      },
      { timeout: 1000 }
    );

    expect(result.current.suggestions[0].place_id).toBe(42);

    // Now test getSuggestionData
    const data = result.current.getSuggestionData(42);
    expect(data).toEqual(mockData[0]);
  });
});
