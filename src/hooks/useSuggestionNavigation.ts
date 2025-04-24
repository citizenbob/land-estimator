import React, { KeyboardEvent, RefObject } from 'react';
import { GeocodeResult } from '@typez/addressMatchTypes';

interface OnSelect {
  (suggestion: GeocodeResult): void;
}

export function useSuggestionNavigation(
  inputRef: RefObject<HTMLInputElement | null>,
  onSelect: OnSelect,
  suggestionRefs: React.RefObject<HTMLLIElement>[]
) {
  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestionRefs.length > 0 && suggestionRefs[0].current) {
        suggestionRefs[0].current.focus();
      }
    }
  };

  const handleSuggestionKeyDown = (
    e: KeyboardEvent<HTMLLIElement>,
    suggestion: GeocodeResult,
    index: number
  ) => {
    if (e.key === 'Enter') {
      onSelect(suggestion);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % suggestionRefs.length;
      if (suggestionRefs[nextIndex].current) {
        suggestionRefs[nextIndex].current?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex =
        (index - 1 + suggestionRefs.length) % suggestionRefs.length;
      if (suggestionRefs[prevIndex].current) {
        suggestionRefs[prevIndex].current?.focus();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  return {
    handleInputKeyDown,
    handleSuggestionKeyDown
  };
}
