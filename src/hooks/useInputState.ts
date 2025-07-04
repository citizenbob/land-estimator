import { useMemo } from 'react';
import { AddressSuggestion, EnrichedAddressSuggestion } from '@app-types';

interface InputState {
  showLoading: boolean;
  showErrorAlert: boolean;
  showSuggestions: boolean;
  showClearButton: boolean;
  showEstimateButton: boolean;
  uniqueSuggestions: EnrichedAddressSuggestion[];
}

/**
 * Converts an AddressSuggestion to an EnrichedAddressSuggestion by ensuring latitude/longitude properties
 * @param suggestion The base suggestion to enrich
 * @returns An enriched suggestion with latitude/longitude properties
 */
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
 * This hook processes the raw state from useAddressLookup and computes derived UI states
 * that determine what should be shown to the user. It handles:
 *
 * 1. Deduplication of suggestions by display_name
 * 2. Enrichment of suggestions with default lat/lon values when missing
 * 3. Logic for when to show/hide various UI elements:
 *    - Loading indicator during API requests
 *    - Error alerts when API calls fail
 *    - Suggestions dropdown with properly formatted items
 *    - Clear button when an address is locked
 *    - Estimate button when ready to proceed
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
