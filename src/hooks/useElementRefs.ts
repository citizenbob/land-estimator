import { useRef, createRef } from 'react';

/**
 * Generic hook to manage element refs for keyboard navigation
 * This is a generalized version of useSuggestionRefs that can work with any type of elements
 */
export function useElementRefs<T extends HTMLElement>(count: number) {
  const elementRefs = useRef<React.RefObject<T>[]>([]);

  // Only create new refs if the count has changed
  if (elementRefs.current.length !== count) {
    const currentRefs = Array.from(
      { length: count },
      (_, i) => elementRefs.current[i] ?? createRef<T>()
    );
    elementRefs.current = currentRefs;
  }

  return {
    elementRefs: elementRefs.current,
    getElementRefs: () => elementRefs.current
  };
}
