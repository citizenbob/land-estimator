import React, { type KeyboardEvent } from 'react';
import { AddressSuggestion } from '@app-types/localAddressTypes';

/**
 * Hook that manages keyboard navigation for suggestion lists
 *
 * @param inputRef - Reference to the input field element
 * @param onSelect - Callback function triggered when a suggestion is selected
 * @param suggestionRefs - Array of references to the suggestion elements
 * @returns Object containing event handlers for keyboard navigation
 */
export function useSuggestionNavigation(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onSelect: (suggestion: AddressSuggestion) => void,
  getSuggestionRefs: () => React.RefObject<HTMLLIElement>[]
) {
  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const suggestionRefs = getSuggestionRefs();
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
    const suggestionRefs = getSuggestionRefs();

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
      // Trigger an escape event on the input to close suggestions
      if (inputRef.current) {
        const escapeEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true
        });
        inputRef.current.dispatchEvent(escapeEvent);
      }
    }
  };
  return {
    handleInputKeyDown,
    handleSuggestionKeyDown
  };
}
