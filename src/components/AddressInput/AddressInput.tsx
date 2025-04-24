'use client';

import React, { useRef, createRef, useEffect, useMemo } from 'react';
import { useAddressLookup } from '@hooks/useAddressLookup';
import { useEventLogger } from '@hooks/useEventLogger';
import { useSuggestionNavigation } from '@hooks/useSuggestionNavigation';
import InputField from '@components/InputField/InputField';
import IconButton from '@components/IconButton/IconButton';
import Button from '@components/Button/Button';
import SuggestionsList from '@components/SuggestionsList/SuggestionsList';
import Alert from '@components/Alert/Alert';
import { Form } from '@components/AddressInput/AddressInput.styles';
import { GeocodeResult } from '@typez/addressMatchTypes';
import { motion } from 'framer-motion';

interface AddressInputProps {
  mockLookup?: Partial<ReturnType<typeof useAddressLookup>> & {
    logEvent?: (
      eventName: string,
      data: Record<string, string | number | boolean>,
      options?: Record<string, unknown>
    ) => void;
    selectedSuggestion?: GeocodeResult;
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
    hasFetched,
    selectedSuggestion: mockSelectedSuggestion
  } = { ...defaultLookup, ...mockLookup };

  const { logEvent: logEventHook } = useEventLogger();
  const logEvent = logEventProp || logEventHook;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionRefs = useRef<React.RefObject<HTMLLIElement>[]>([]);

  const selectedSuggestion = useRef<GeocodeResult | null>(
    mockSelectedSuggestion || null
  );

  const onSelect = (suggestion: GeocodeResult) => {
    handleSelect(suggestion.displayName);
    selectedSuggestion.current = suggestion;

    if (logEvent) {
      logEvent(
        'Address Selected',
        {
          address: suggestion.displayName,
          lat: suggestion.lat,
          lon: suggestion.lon
        },
        { toMixpanel: true, toFirestore: true }
      );
    }
  };

  const onEstimateClick = () => {
    const matched = selectedSuggestion.current;
    if (
      !matched ||
      !matched.displayName ||
      matched.lat === undefined ||
      matched.lon === undefined
    ) {
      return;
    }
    if (logEvent) {
      logEvent(
        'Request Estimate',
        {
          address: matched.displayName,
          lat: matched.lat,
          lon: matched.lon,
          confirmedIntent: true
        },
        { toMixpanel: true, toFirestore: true }
      );
    } else {
      console.error('logEvent is not defined');
    }
  };

  const uniqueSuggestions = useMemo(() => {
    return [
      ...new Map(
        suggestions.map((s) => [
          s.displayName,
          { ...s, lat: s.lat ?? 0, lon: s.lon ?? 0 }
        ])
      ).values()
    ];
  }, [suggestions]);

  useEffect(() => {
    suggestionRefs.current = uniqueSuggestions.map(
      (_, i) => suggestionRefs.current[i] ?? createRef<HTMLLIElement>()
    );
  }, [uniqueSuggestions]);

  const { handleInputKeyDown, handleSuggestionKeyDown } =
    useSuggestionNavigation(inputRef, onSelect, suggestionRefs.current);

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
        {isFetching && (
          <motion.div
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: 'linear', duration: 0.8 }}
          />
        )}
        {locked && (
          <IconButton
            aria-label="Change Address"
            onClick={() => handleChange('')}
          >
            ×
          </IconButton>
        )}
      </div>
      {!isFetching &&
        hasFetched &&
        !locked &&
        query.trim() !== '' &&
        suggestions.length === 0 && (
          <Alert role="alert" type="error">
            Error fetching suggestions
          </Alert>
        )}
      {showSuggestions && (
        <SuggestionsList
          suggestions={uniqueSuggestions}
          onSelect={onSelect}
          suggestionRefs={suggestionRefs.current}
          onSuggestionKeyDown={handleSuggestionKeyDown}
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
