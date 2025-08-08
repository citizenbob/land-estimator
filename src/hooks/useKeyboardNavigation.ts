import React, { type KeyboardEvent } from 'react';

/**
 * Generic hook that manages keyboard navigation for element lists
 * This is a generalized version of useSuggestionNavigation
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  triggerRef: React.RefObject<HTMLElement | null>,
  onSelect?: (index: number) => void,
  getElementRefs?: () => React.RefObject<T>[]
) {
  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const elementRefs = getElementRefs?.();
      if (elementRefs && elementRefs.length > 0 && elementRefs[0].current) {
        elementRefs[0].current.focus();
      }
    }
  };

  const handleElementKeyDown = (e: KeyboardEvent<T>, index: number) => {
    const elementRefs = getElementRefs?.();
    if (!elementRefs) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(index);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % elementRefs.length;
      if (elementRefs[nextIndex].current) {
        elementRefs[nextIndex].current?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + elementRefs.length) % elementRefs.length;
      if (elementRefs[prevIndex].current) {
        elementRefs[prevIndex].current?.focus();
      }
    } else if (e.key === 'Tab') {
      // Allow normal tab behavior to move to next/previous focusable element
      return;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      triggerRef.current?.focus();
    }
  };

  return {
    handleTriggerKeyDown,
    handleElementKeyDown
  };
}
