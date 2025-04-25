import React from 'react';
import { AddressSuggestion } from '@typez/addressMatchTypes';
import {
  SuggestionsListStyles as List,
  SuggestionItemStyles as ListItem
} from './SuggestionsList.styles';

interface SuggestionsListProps {
  suggestions: AddressSuggestion[];
  onSelect: (suggestion: AddressSuggestion) => void;
  suggestionRefs: React.RefObject<HTMLLIElement>[];
  onSuggestionKeyDown: (
    e: React.KeyboardEvent<HTMLLIElement>,
    suggestion: AddressSuggestion,
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
          key={suggestion.place_id}
          ref={suggestionRefs[index]}
          role="option"
          aria-selected="false"
          tabIndex={-1}
          onClick={() => onSelect(suggestion)}
          onKeyDown={(e: React.KeyboardEvent<HTMLLIElement>) =>
            onSuggestionKeyDown(e, suggestion, index)
          }
          data-display={suggestion.display_name}
        >
          {suggestion.display_name}
        </ListItem>
      ))}
    </List>
  );
};

export default SuggestionsList;
