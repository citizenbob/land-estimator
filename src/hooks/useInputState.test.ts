import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useInputState } from './useInputState';
import { AddressSuggestion } from '@typez/addressMatchTypes';

describe('useInputState', () => {
  it('should return correct state for loading state', () => {
    const query = 'test';
    const suggestions: AddressSuggestion[] = [];
    const isFetching = true;
    const hasFetched = false;
    const locked = false;

    const { result } = renderHook(() =>
      useInputState(query, suggestions, isFetching, hasFetched, locked)
    );

    expect(result.current.showLoading).toBe(true);
    expect(result.current.showErrorAlert).toBe(false);
    expect(result.current.showSuggestions).toBe(false);
    expect(result.current.showClearButton).toBe(false);
    expect(result.current.showEstimateButton).toBe(false);
    expect(result.current.uniqueSuggestions).toEqual([]);
  });

  it('should return correct state for error state', () => {
    const query = 'test';
    const suggestions: AddressSuggestion[] = [];
    const isFetching = false;
    const hasFetched = true;
    const locked = false;

    const { result } = renderHook(() =>
      useInputState(query, suggestions, isFetching, hasFetched, locked)
    );

    expect(result.current.showLoading).toBe(false);
    expect(result.current.showErrorAlert).toBe(true);
    expect(result.current.showSuggestions).toBe(false);
    expect(result.current.showClearButton).toBe(false);
    expect(result.current.showEstimateButton).toBe(false);
    expect(result.current.uniqueSuggestions).toEqual([]);
  });

  it('should return correct state when showing suggestions', () => {
    const query = 'test';
    const suggestions: AddressSuggestion[] = [
      { place_id: 1, display_name: 'test location' }
    ];
    const isFetching = false;
    const hasFetched = true;
    const locked = false;

    const { result } = renderHook(() =>
      useInputState(query, suggestions, isFetching, hasFetched, locked)
    );

    expect(result.current.showLoading).toBe(false);
    expect(result.current.showErrorAlert).toBe(false);
    expect(result.current.showSuggestions).toBe(true);
    expect(result.current.showClearButton).toBe(false);
    expect(result.current.showEstimateButton).toBe(false);
    expect(result.current.uniqueSuggestions).toHaveLength(1);
  });

  it('should return correct state for locked state', () => {
    const query = 'test location';
    const suggestions: AddressSuggestion[] = [
      { place_id: 1, display_name: 'test location' }
    ];
    const isFetching = false;
    const hasFetched = true;
    const locked = true;

    const { result } = renderHook(() =>
      useInputState(query, suggestions, isFetching, hasFetched, locked)
    );

    expect(result.current.showLoading).toBe(false);
    expect(result.current.showErrorAlert).toBe(false);
    expect(result.current.showSuggestions).toBe(false);
    expect(result.current.showClearButton).toBe(true);
    expect(result.current.showEstimateButton).toBe(true);
    expect(result.current.uniqueSuggestions).toHaveLength(1);
  });

  it('should deduplicate suggestions by display_name', () => {
    const query = 'test';
    const suggestions: AddressSuggestion[] = [
      { place_id: 1, display_name: 'test location' },
      { place_id: 2, display_name: 'test location' },
      { place_id: 3, display_name: 'another location' }
    ];
    const isFetching = false;
    const hasFetched = true;
    const locked = false;

    const { result } = renderHook(() =>
      useInputState(query, suggestions, isFetching, hasFetched, locked)
    );

    expect(result.current.uniqueSuggestions).toHaveLength(2);
  });

  it('should not show suggestions if query matches a suggestion display_name', () => {
    const query = 'test location';
    const suggestions: AddressSuggestion[] = [
      { place_id: 1, display_name: 'test location' }
    ];
    const isFetching = false;
    const hasFetched = true;
    const locked = false;

    const { result } = renderHook(() =>
      useInputState(query, suggestions, isFetching, hasFetched, locked)
    );

    expect(result.current.showSuggestions).toBe(false);
  });
});
