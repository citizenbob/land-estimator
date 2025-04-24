import React from 'react';
import { GeocodeResult } from '@typez/addressMatchTypes';
import {
  SuggestionsListStyles as List,
  SuggestionItemStyles as ListItem
} from './SuggestionsList.styles';

interface SuggestionsListProps {
  suggestions: GeocodeResult[];
  onSelect: (suggestion: GeocodeResult) => void;
  suggestionRefs: React.RefObject<HTMLLIElement>[];
  onSuggestionKeyDown: (
    e: React.KeyboardEvent<HTMLLIElement>,
    suggestion: GeocodeResult,
    index: number
  ) => void;
}

const SuggestionsList: React.FC<SuggestionsListProps> = ({
  suggestions,
  onSelect,
  suggestionRefs,
  onSuggestionKeyDown
}) => {
  return (
    <List role="listbox">
      {suggestions.map((suggestion, index) => (
        <ListItem
          key={suggestion.displayName}
          ref={suggestionRefs[index]}
          role="option"
          aria-selected="false"
          tabIndex={-1}
          onClick={() => onSelect(suggestion)}
          onKeyDown={(e: React.KeyboardEvent<HTMLLIElement>) =>
            onSuggestionKeyDown(e, suggestion, index)
          }
          data-display={suggestion.displayName}
        >
          {suggestion.displayName}
        </ListItem>
      ))}
    </List>
  );
};

export default SuggestionsList;
