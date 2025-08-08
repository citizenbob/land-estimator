import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { createRef } from 'react';

describe('useKeyboardNavigation', () => {
  it('should return navigation handlers', () => {
    const triggerRef = createRef<HTMLElement>();

    const { result } = renderHook(() => useKeyboardNavigation(triggerRef));

    expect(result.current).toHaveProperty('handleTriggerKeyDown');
    expect(result.current).toHaveProperty('handleElementKeyDown');
    expect(typeof result.current.handleTriggerKeyDown).toBe('function');
    expect(typeof result.current.handleElementKeyDown).toBe('function');
  });

  it('should work with all parameters', () => {
    const triggerRef = createRef<HTMLElement>();
    const onSelect = () => {};
    const getElementRefs = () => [];

    const { result } = renderHook(() =>
      useKeyboardNavigation(triggerRef, onSelect, getElementRefs)
    );

    expect(result.current).toHaveProperty('handleTriggerKeyDown');
    expect(result.current).toHaveProperty('handleElementKeyDown');
  });

  it('should provide consistent output structure', () => {
    const triggerRef = createRef<HTMLElement>();

    const { result } = renderHook(() => useKeyboardNavigation(triggerRef));

    expect(Object.keys(result.current)).toEqual([
      'handleTriggerKeyDown',
      'handleElementKeyDown'
    ]);
  });
});
