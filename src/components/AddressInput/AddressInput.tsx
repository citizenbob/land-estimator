'use client';

import React, { useRef } from 'react';
import { useAddressLookup } from '@hooks/useAddressLookup';
import { useEventLogger } from '@hooks/useEventLogger';
import InputField from '@components/InputField/InputField';
import IconButton from '@components/IconButton/IconButton';
import Button from '@components/Button/Button';
import SuggestionsList from '@components/SuggestionsList/SuggestionsList';
import Alert from '@components/Alert/Alert';
import { Form } from '@components/AddressInput/AddressInput.styles';
import { Suggestion } from '@typez/addressMatchTypes';

const getSuggestionElements = (): HTMLElement[] =>
  Array.from(document.querySelectorAll('[data-display]')) as HTMLElement[];

const handleSuggestionKeyDown = (
  e: React.KeyboardEvent<HTMLLIElement>,
  index: number,
  onSelect: (address: string) => void,
  inputRef: React.RefObject<HTMLInputElement | null>
) => {
  e.preventDefault();
  const items = getSuggestionElements();
  if (e.key === 'ArrowDown') {
    items[(index + 1) % items.length]?.focus();
  } else if (e.key === 'ArrowUp') {
    items[(index - 1 + items.length) % items.length]?.focus();
  } else if (e.key === 'Enter') {
    onSelect(items[index]?.getAttribute('data-display') || '');
  } else if (e.key === 'Tab') {
    inputRef.current?.focus();
  }
};

const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    getSuggestionElements()[0]?.focus();
  }
};

interface AddressInputProps {
  mockLookup?: Partial<ReturnType<typeof useAddressLookup>> & {
    logEvent?: (
      eventName: string,
      data: Record<string, string | number | boolean>,
      options?: Record<string, unknown>
    ) => void;
  };
  logEvent?: (
    eventName: string,
    data: Record<string, string | number | boolean>,
    options?: Record<string, unknown>
  ) => void;
}

const AddressInput = ({
  mockLookup,
  logEvent: logEventProp
}: AddressInputProps) => {
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

  const { logEvent: logEventHook } = useEventLogger();
  const logEvent = logEventProp || logEventHook;

  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedSuggestion = useRef<Suggestion | null>(null);

  const onSelect = (suggestion: Suggestion) => {
    handleSelect(suggestion.displayName);
    selectedSuggestion.current = suggestion;

    // Log the address selection event
    if (logEvent) {
      logEvent(
        'Address Selected',
        {
          address: suggestion.displayName,
          lat: suggestion.latitude,
          lon: suggestion.longitude
        },
        { toMixpanel: true, toFirestore: true }
      );
    }
    {
      return;
    }
  };

  const onEstimateClick = () => {
    const matched = selectedSuggestion.current;
    if (
      !matched ||
      !matched.displayName ||
      matched.latitude === undefined ||
      matched.longitude === undefined
    ) {
      return;
    }
    if (logEvent) {
      logEvent(
        'Request Estimate',
        {
          address: matched.displayName,
          lat: matched.latitude,
          lon: matched.longitude,
          confirmedIntent: true
        },
        { toMixpanel: true, toFirestore: true }
      );
    } else {
      console.error('logEvent is not defined');
    }
  };

  const uniqueSuggestions = [
    ...new Map(
      suggestions.map((s) => [
        s.displayName,
        { ...s, latitude: s.latitude ?? 0, longitude: s.longitude ?? 0 }
      ])
    ).values()
  ];

  const showSuggestions =
    (query?.trim() ?? '') !== '' &&
    uniqueSuggestions.length > 0 &&
    !uniqueSuggestions.some((s) => s.displayName === query);

  return (
    <Form>
      <div className="relative input-group">
        <InputField
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
      {isFetching && <Alert role="status">Fetching suggestions</Alert>}
      {!isFetching &&
        hasFetched &&
        !locked &&
        query.trim() !== '' &&
        suggestions.length === 0 && (
          <Alert role="alert">Error fetching suggestions</Alert>
        )}
      {showSuggestions && (
        <SuggestionsList
          suggestions={uniqueSuggestions}
          onSelect={onSelect}
          onKeyDown={(e, index) =>
            handleSuggestionKeyDown(
              e,
              index,
              (address) =>
                onSelect({
                  displayName: address,
                  latitude: '0',
                  longitude: '0',
                  value: address
                }),
              inputRef
            )
          }
        />
      )}
      {locked && (
        <Button onClick={onEstimateClick} aria-label="Get Instant Estimate">
          Get Instant Estimate
        </Button>
      )}
    </Form>
  );
};

export default AddressInput;
