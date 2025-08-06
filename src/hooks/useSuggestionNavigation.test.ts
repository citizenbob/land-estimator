import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { useSuggestionNavigation } from './useSuggestionNavigation';
import { MOCK_SUGGESTIONS } from '@lib/testData';
import { createTestSuite } from '@lib/testUtils';

describe('useSuggestionNavigation', () => {
  const testSuite = createTestSuite({ consoleMocks: true });

  beforeEach(() => {
    testSuite.beforeEachSetup();
  });

  afterEach(() => {
    testSuite.afterEachCleanup();
  });

  it('should call onSelect when Enter is pressed on a suggestion', () => {
    const mockOnSelect = vi.fn();
    const mockInputRef = { current: document.createElement('input') };
    const mockSuggestionRefs: React.RefObject<HTMLLIElement>[] = [];

    const { result } = renderHook(() =>
      useSuggestionNavigation(mockInputRef, mockOnSelect, mockSuggestionRefs)
    );

    const mockEvent = {
      key: 'Enter',
      preventDefault: vi.fn()
    } as unknown as React.KeyboardEvent<HTMLLIElement>;

    act(() => {
      result.current.handleSuggestionKeyDown(mockEvent, MOCK_SUGGESTIONS[0], 0);
    });

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(MOCK_SUGGESTIONS[0]);
  });

  it('should focus the first suggestion when ArrowDown is pressed in the input', () => {
    const mockOnSelect = vi.fn();
    const mockInputRef = { current: document.createElement('input') };
    const mockSuggestionRefs: React.RefObject<HTMLLIElement>[] = [
      { current: document.createElement('li') },
      { current: document.createElement('li') }
    ];
    mockSuggestionRefs.forEach(
      (ref) => ref.current && vi.spyOn(ref.current, 'focus')
    );

    const { result } = renderHook(() =>
      useSuggestionNavigation(mockInputRef, mockOnSelect, mockSuggestionRefs)
    );

    const mockEvent = {
      key: 'ArrowDown',
      preventDefault: vi.fn()
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    act(() => {
      result.current.handleInputKeyDown(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockSuggestionRefs[0].current?.focus).toHaveBeenCalledTimes(1);
  });

  it('should navigate between suggestions using ArrowDown and ArrowUp', () => {
    const mockOnSelect = vi.fn();
    const mockInputRef = { current: document.createElement('input') };
    const mockSuggestionRefs: React.RefObject<HTMLLIElement>[] = [
      { current: document.createElement('li') },
      { current: document.createElement('li') },
      { current: document.createElement('li') }
    ];
    mockSuggestionRefs.forEach(
      (ref) => ref.current && vi.spyOn(ref.current, 'focus')
    );

    const { result } = renderHook(() =>
      useSuggestionNavigation(mockInputRef, mockOnSelect, mockSuggestionRefs)
    );

    const mockEventDown = {
      key: 'ArrowDown',
      preventDefault: vi.fn()
    } as unknown as React.KeyboardEvent<HTMLLIElement>;

    act(() => {
      result.current.handleSuggestionKeyDown(
        mockEventDown,
        MOCK_SUGGESTIONS[0],
        0
      );
    });
    expect(mockEventDown.preventDefault).toHaveBeenCalled();
    expect(mockSuggestionRefs[1].current?.focus).toHaveBeenCalledTimes(1);

    const mockEventUp = {
      key: 'ArrowUp',
      preventDefault: vi.fn()
    } as unknown as React.KeyboardEvent<HTMLLIElement>;

    act(() => {
      result.current.handleSuggestionKeyDown(
        mockEventUp,
        MOCK_SUGGESTIONS[1],
        1
      );
    });
    expect(mockEventUp.preventDefault).toHaveBeenCalled();
    expect(mockSuggestionRefs[0].current?.focus).toHaveBeenCalledTimes(1);
  });

  it('should focus the input when Escape is pressed in a suggestion', () => {
    const mockOnSelect = vi.fn();
    const mockInputRef = { current: document.createElement('input') };
    vi.spyOn(mockInputRef.current, 'focus');
    const mockSuggestionRefs: React.RefObject<HTMLLIElement>[] = [
      { current: document.createElement('li') }
    ];

    const { result } = renderHook(() =>
      useSuggestionNavigation(mockInputRef, mockOnSelect, mockSuggestionRefs)
    );

    const mockEvent = {
      key: 'Escape',
      preventDefault: vi.fn()
    } as unknown as React.KeyboardEvent<HTMLLIElement>;

    act(() => {
      result.current.handleSuggestionKeyDown(mockEvent, MOCK_SUGGESTIONS[0], 0);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockInputRef.current.focus).toHaveBeenCalledTimes(1);
  });

  it('should not prevent default for Tab key in input', () => {
    const mockOnSelect = vi.fn();
    const mockInputRef = { current: document.createElement('input') };
    const mockSuggestionRefs: React.RefObject<HTMLLIElement>[] = [];

    const { result } = renderHook(() =>
      useSuggestionNavigation(mockInputRef, mockOnSelect, mockSuggestionRefs)
    );

    const mockEvent = {
      key: 'Tab',
      preventDefault: vi.fn()
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    act(() => {
      result.current.handleInputKeyDown(mockEvent);
    });

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('should not prevent default for Tab key in suggestions', () => {
    const mockOnSelect = vi.fn();
    const mockInputRef = { current: document.createElement('input') };
    const mockSuggestionRefs: React.RefObject<HTMLLIElement>[] = [
      { current: document.createElement('li') }
    ];

    const { result } = renderHook(() =>
      useSuggestionNavigation(mockInputRef, mockOnSelect, mockSuggestionRefs)
    );

    const mockEvent = {
      key: 'Tab',
      preventDefault: vi.fn()
    } as unknown as React.KeyboardEvent<HTMLLIElement>;

    act(() => {
      result.current.handleSuggestionKeyDown(mockEvent, MOCK_SUGGESTIONS[0], 0);
    });

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('should wrap focus from the first item to the last item when ArrowUp is pressed', () => {
    const mockOnSelect = vi.fn();
    const mockInputRef = { current: document.createElement('input') };
    const mockSuggestionRefs: React.RefObject<HTMLLIElement>[] = [
      { current: document.createElement('li') },
      { current: document.createElement('li') },
      { current: document.createElement('li') }
    ];
    mockSuggestionRefs.forEach(
      (ref) => ref.current && vi.spyOn(ref.current, 'focus')
    );

    const { result } = renderHook(() =>
      useSuggestionNavigation(mockInputRef, mockOnSelect, mockSuggestionRefs)
    );

    const mockEventUp = {
      key: 'ArrowUp',
      preventDefault: vi.fn()
    } as unknown as React.KeyboardEvent<HTMLLIElement>;

    act(() => {
      result.current.handleSuggestionKeyDown(
        mockEventUp,
        MOCK_SUGGESTIONS[0],
        0
      );
    });

    expect(mockEventUp.preventDefault).toHaveBeenCalled();
    expect(mockSuggestionRefs[2].current?.focus).toHaveBeenCalledTimes(1);
  });

  it('should wrap focus from the last item to the first item when ArrowDown is pressed', () => {
    const mockOnSelect = vi.fn();
    const mockInputRef = { current: document.createElement('input') };
    const mockSuggestionRefs: React.RefObject<HTMLLIElement>[] = [
      { current: document.createElement('li') },
      { current: document.createElement('li') },
      { current: document.createElement('li') }
    ];
    mockSuggestionRefs.forEach(
      (ref) => ref.current && vi.spyOn(ref.current, 'focus')
    );

    const { result } = renderHook(() =>
      useSuggestionNavigation(mockInputRef, mockOnSelect, mockSuggestionRefs)
    );

    const mockEventDown = {
      key: 'ArrowDown',
      preventDefault: vi.fn()
    } as unknown as React.KeyboardEvent<HTMLLIElement>;

    act(() => {
      result.current.handleSuggestionKeyDown(
        mockEventDown,
        MOCK_SUGGESTIONS[2],
        2
      );
    });

    expect(mockEventDown.preventDefault).toHaveBeenCalled();
    expect(mockSuggestionRefs[0].current?.focus).toHaveBeenCalledTimes(1);
  });
});
