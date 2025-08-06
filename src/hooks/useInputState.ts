import { useMemo } from 'react';
import {
  AddressSuggestion,
  EnrichedAddressSuggestion
} from '@app-types/localAddressTypes';

interface InputState {
  showLoading: boolean;
  showErrorAlert: boolean;
  showSuggestions: boolean;
  showClearButton: boolean;
  showEstimateButton: boolean;
  uniqueSuggestions: EnrichedAddressSuggestion[];
}

export function enrichSuggestion(
  suggestion: AddressSuggestion
): EnrichedAddressSuggestion {
  return {
    ...suggestion,
    latitude: (suggestion as EnrichedAddressSuggestion).latitude ?? 0,
    longitude: (suggestion as EnrichedAddressSuggestion).longitude ?? 0,
    region: (suggestion as EnrichedAddressSuggestion).region ?? 'Unknown',
    calc: (suggestion as EnrichedAddressSuggestion).calc ?? {
      landarea: 0,
      building_sqft: 0,
      estimated_landscapable_area: 0,
      property_type: 'unknown'
    },
    affluence_score:
      (suggestion as EnrichedAddressSuggestion).affluence_score ?? 0
  };
}

/**
 * Hook that manages derived UI states for the AddressInput component
 *
 * @param query - The current search query text
 * @param suggestions - Array of address suggestions from the API
 * @param isFetching - Whether an API request is currently in progress
 * @param hasFetched - Whether any API request has been completed
 * @param locked - Whether the input is locked (a selection has been made)
 * @returns Object containing derived UI states and processed suggestion data
 */
export function useInputState(
  query: string,
  suggestions: AddressSuggestion[],
  isFetching: boolean,
  hasFetched: boolean,
  locked: boolean
): InputState {
  const uniqueSuggestions = useMemo(() => {
    const suggestionMap = new Map(
      suggestions.map((s) => [s.display_name, enrichSuggestion(s)])
    );
    return [...suggestionMap.values()];
  }, [suggestions]);

  const showSuggestions =
    (query?.trim() ?? '') !== '' &&
    uniqueSuggestions.length > 0 &&
    !uniqueSuggestions.some((s) => s.display_name === query) &&
    !locked;

  const showErrorAlert =
    !isFetching &&
    hasFetched &&
    !locked &&
    query.trim() !== '' &&
    suggestions.length === 0;

  const showLoading = isFetching;
  const showClearButton = locked;
  const showEstimateButton = locked;

  return {
    showLoading,
    showErrorAlert,
    showSuggestions,
    showClearButton,
    showEstimateButton,
    uniqueSuggestions
  };
}
