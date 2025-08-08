import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useElementRefs } from './useElementRefs';

describe('useElementRefs', () => {
  it('creates the correct number of refs', () => {
    const { result } = renderHook(() => useElementRefs<HTMLInputElement>(3));

    expect(result.current.elementRefs).toHaveLength(3);
    expect(result.current.getElementRefs()).toHaveLength(3);
  });

  it('maintains refs when count stays the same', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useElementRefs<HTMLInputElement>(count),
      { initialProps: { count: 3 } }
    );

    const initialRefs = result.current.elementRefs;

    rerender({ count: 3 });

    expect(result.current.elementRefs).toBe(initialRefs);
  });

  it('creates new refs when count increases', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useElementRefs<HTMLInputElement>(count),
      { initialProps: { count: 2 } }
    );

    expect(result.current.elementRefs).toHaveLength(2);

    rerender({ count: 4 });

    expect(result.current.elementRefs).toHaveLength(4);
  });

  it('reduces refs when count decreases', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useElementRefs<HTMLInputElement>(count),
      { initialProps: { count: 5 } }
    );

    expect(result.current.elementRefs).toHaveLength(5);

    rerender({ count: 2 });

    expect(result.current.elementRefs).toHaveLength(2);
  });

  it('handles zero count', () => {
    const { result } = renderHook(() => useElementRefs<HTMLInputElement>(0));

    expect(result.current.elementRefs).toHaveLength(0);
  });
});
