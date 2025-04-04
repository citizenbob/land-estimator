'use client';

import React, { useRef } from 'react';
import { useAddressLookup } from '@hooks/useAddressLookup';
// Define the Suggestion type locally if it's not exported from the module
type Suggestion = {
  displayName: string;
  label?: string;
  [key: string]: unknown;
};
import {
  Form,
  Input,
  IconButton,
  Button,
  SuggestionsList,
  SuggestionItem
} from './AddressInput.styles';
import { logEvent as importedLogEvent } from '@services/logger';

if (typeof window !== 'undefined') {
  window.logEvent = (
    eventOrEventName:
      | { eventName: string; data: Record<string, unknown> }
      | string,
    data?: Record<string, unknown>
  ) => {
    if (typeof eventOrEventName === 'string' && data) {
      importedLogEvent({ eventName: eventOrEventName, data });
    } else if (typeof eventOrEventName === 'object') {
      importedLogEvent(eventOrEventName);
    }
  };
}

// Local logEvent helper that calls window.logEvent with a single object.
const logEvent = (event: {
  eventName: string;
  data: Record<string, unknown>;
}) => {
  window.logEvent({ eventName: event.eventName, data: event.data });
};

const getSuggestionElements = (): HTMLElement[] =>
  Array.from(document.querySelectorAll('[data-display]')) as HTMLElement[];

const handleSuggestionKeyDown = (
  e: React.KeyboardEvent<HTMLLIElement>,
  index: number,
  onSelect: (address: string) => void
) => {
  e.preventDefault();
  const items = getSuggestionElements();
  if (e.key === 'ArrowDown') {
    const next = (index + 1) % items.length;
    items[next].focus();
  } else if (e.key === 'ArrowUp') {
    const prev = (index - 1 + items.length) % items.length;
    items[prev].focus();
  } else if (e.key === 'Enter') {
    onSelect(items[index].getAttribute('data-display') || '');
  } else if (e.key === 'Tab') {
    const input = document.querySelector(
      'input[placeholder="Enter address"]'
    ) as HTMLElement;
    input?.focus();
  }
};

const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const items = getSuggestionElements();
    if (items.length > 0) {
      items[0].focus();
    }
    e.stopPropagation();
  }
};

interface AddressInputProps {
  mockLookup?: Partial<ReturnType<typeof useAddressLookup>>;
}

const AddressInput = ({ mockLookup }: AddressInputProps) => {
  const defaultLookup = useAddressLookup();
  const {
    query,
    suggestions,
    handleChange,
    handleSelect,
    isFetching,
    locked,
    hasFetched
  } = { ...defaultLookup, ...mockLookup };

  const inputRef = useRef<HTMLInputElement>(null);
  const selectedSuggestion = useRef<Suggestion | null>(null);

  const onSelect = (address: string) => {
    handleSelect(address);
    const matchedSuggestion = suggestions.find(
      (s) => s.displayName === address
    );
    selectedSuggestion.current = matchedSuggestion || null;
    logEvent({
      eventName: 'Address Matched',
      data: {
        ...matchedSuggestion,
        confirmedIntent: false
      }
    });
  };

  const onEstimateClick = () => {
    const matched = selectedSuggestion.current;
    if (!matched) return;
    logEvent({
      eventName: 'Request Estimate',
      data: {
        ...matched,
        confirmedIntent: true
      }
    });
  };

  const uniqueSuggestions = [
    ...new Map(suggestions.map((s) => [s.displayName, s])).values()
  ];

  const showSuggestions =
    query.trim() !== '' &&
    uniqueSuggestions.length > 0 &&
    !uniqueSuggestions.some((s) => s.displayName === query);

  return (
    <Form>
      <div className="relative input-group">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Enter address"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        {locked && (
          <IconButton
            aria-label="Change Address"
            onClick={() => handleChange('')}
          >
            ×
          </IconButton>
        )}
      </div>
      {isFetching && <div role="status">Fetching suggestions</div>}
      {!isFetching &&
        hasFetched &&
        !locked &&
        query.trim() !== '' &&
        suggestions.length === 0 && (
          <div role="alert">Error fetching suggestions</div>
        )}
      {showSuggestions && (
        <SuggestionsList>
          {uniqueSuggestions.map((s, index) => (
            <SuggestionItem
              key={`${s.displayName}-${index}`}
              data-display={s.displayName}
              tabIndex={0}
              onClick={() => onSelect(s.displayName)}
              onKeyDown={(e) => handleSuggestionKeyDown(e, index, onSelect)}
            >
              {s.label || s.displayName || 'Unknown Location'}
            </SuggestionItem>
          ))}
        </SuggestionsList>
      )}
      {locked && (
        <Button onClick={onEstimateClick}>Get Instant Estimate</Button>
      )}
    </Form>
  );
};

export default AddressInput;
