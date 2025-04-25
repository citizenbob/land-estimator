import React, { KeyboardEvent } from 'react';
import { AddressSuggestion } from '@typez/addressMatchTypes';

/**
 * Hook that manages keyboard navigation for a list of suggestions
 *
 * This hook implements the WAI-ARIA keyboard interaction patterns for comboboxes:
 * - Arrow up/down: Navigate through suggestions (with wrapping)
 * - Enter: Select the current suggestion
 * - Escape: Close the suggestions and return focus to input
 * - Tab: Standard tab behavior (no prevention)
 *
 * The focus management follows this pattern:
 * 1. Input field receives focus initially
 * 2. Arrow keys move focus between suggestion items
 * 3. Escape key returns focus to the input field
 * 4. Selection via Enter or click triggers the onSelect callback
 *
 * @param inputRef - Reference to the input field element
 * @param onSelect - Callback function triggered when a suggestion is selected
 * @param suggestionRefs - Array of references to the suggestion elements
 * @returns Object containing event handlers for keyboard navigation
 */
export function useSuggestionNavigation(
  inputRef: React.RefObject<HTMLInputElement>,
  onSelect: (suggestion: AddressSuggestion) => void,
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
    suggestion: AddressSuggestion,
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
