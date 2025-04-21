import React from 'react';
import {
  SuggestionsListStyles,
  SuggestionItemStyles
} from './SuggestionsList.styles';
import { GeocodeResult } from '@typez/addressMatchTypes';

interface SuggestionsListProps {
  suggestions: GeocodeResult[];
  onSelect: (suggestion: GeocodeResult) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLLIElement>, index: number) => void;
  logEvent?: (
    eventName: string,
    data: { address: string; lat: string; lon: string },
    options?: Record<string, unknown>
  ) => void;
}

const SuggestionsList: React.FC<SuggestionsListProps> = ({
  suggestions,
  onSelect,
  onKeyDown,
  logEvent
}) => {
  const itemsRef = React.useRef<HTMLElement[]>([]);

  const handleSelect = (suggestion: GeocodeResult) => {
    onSelect(suggestion);

    // Log the suggestion selection event
    if (logEvent) {
      logEvent(
        'Suggestion Selected',
        {
          address: suggestion.displayName,
          lat: suggestion.lat,
          lon: suggestion.lon
        },
        { toMixpanel: true, toFirestore: true }
      );
    }
  };

  return (
    <SuggestionsListStyles>
      {suggestions.map((s, index) => (
        <SuggestionItemStyles
          key={`${s.displayName}-${index}`}
          data-display={s.displayName}
          tabIndex={0}
          ref={(el) => {
            itemsRef.current[index] = el!;
          }}
          onClick={() => handleSelect(s)}
          onKeyDown={(e) => onKeyDown?.(e, index)}
        >
          {s.label || s.displayName || 'Unknown Location'}
        </SuggestionItemStyles>
      ))}
    </SuggestionsListStyles>
  );
};

export default SuggestionsList;
