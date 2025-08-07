import { useRef, createRef } from 'react';
import { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';

/**
 * Custom hook to manage suggestion refs for keyboard navigation
 */
export function useSuggestionRefs(suggestions: EnrichedAddressSuggestion[]) {
  const suggestionRefs = useRef<React.RefObject<HTMLLIElement>[]>([]);

  // Create refs synchronously when suggestions change
  const currentRefs = suggestions.map(
    (_, i) => suggestionRefs.current[i] ?? createRef<HTMLLIElement>()
  );
  suggestionRefs.current = currentRefs;

  return {
    suggestionRefs: suggestionRefs.current,
    getSuggestionRefs: () => suggestionRefs.current
  };
}
