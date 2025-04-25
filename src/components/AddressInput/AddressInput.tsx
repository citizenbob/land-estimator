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
import {
  AddressSuggestion,
  EnrichedAddressSuggestion
} from '@typez/addressMatchTypes';
import { motion } from 'framer-motion';

interface AddressInputProps {
  mockLookup?: Partial<ReturnType<typeof useAddressLookup>> & {
    logEvent?: (
      eventName: string,
      data: Record<string, string | number | boolean | string[]>,
      options?: Record<string, unknown>
    ) => void;
    selectedSuggestion?: AddressSuggestion;
  };
  logEvent?: (
    eventName: string,
    data: Record<string, string | number | boolean | string[]>,
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
    getSuggestionData,
    selectedSuggestion: mockSelectedSuggestion
  } = { ...defaultLookup, ...mockLookup };

  const { logEvent: logEventHook } = useEventLogger();
  const logEvent = logEventProp || logEventHook;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionRefs = useRef<React.RefObject<HTMLLIElement>[]>([]);

  const selectedSuggestion = useRef<AddressSuggestion | null>(
    mockSelectedSuggestion || null
  );

  const createAddressPayload = (
    suggestionId: number,
    confirmedIntent = false
  ) => {
    const fullData = getSuggestionData(suggestionId);

    if (!fullData) {
      console.error(`No data found for suggestion ID ${suggestionId}`);
      return null;
    }

    // Convert lat/lon strings to numbers, fallback to 0
    const lat = fullData.lat ? parseFloat(fullData.lat) : 0;
    const lon = fullData.lon ? parseFloat(fullData.lon) : 0;

    return {
      id: fullData.place_id,
      address: fullData.display_name,
      lat,
      lon,
      boundingbox: fullData.boundingbox || [],
      confirmedIntent
    };
  };

  const onSelect = (suggestion: AddressSuggestion) => {
    handleSelect(suggestion.display_name);
    selectedSuggestion.current = suggestion;

    if (logEvent) {
      const payload = createAddressPayload(suggestion.place_id, false);
      if (payload) {
        logEvent('Address Selected', payload, {
          toMixpanel: true,
          toFirestore: true
        });
      }
    }
  };

  const onEstimateClick = () => {
    let matched = selectedSuggestion.current;
    if (!matched && suggestions.length > 0) {
      matched =
        suggestions.find((s) => s.display_name === query) || suggestions[0];
      selectedSuggestion.current = matched;
    }

    if (!matched) {
      return;
    }

    if (logEvent) {
      const payload = createAddressPayload(matched.place_id, true);
      if (payload) {
        logEvent('Request Estimate', payload, {
          toMixpanel: true,
          toFirestore: true
        });
      }
    }
  };

  const uniqueSuggestions = useMemo(() => {
    return [
      ...new Map(
        suggestions.map((s) => [
          s.display_name,
          {
            ...s,
            lat: (s as EnrichedAddressSuggestion).lat ?? 0,
            lon: (s as EnrichedAddressSuggestion).lon ?? 0
          }
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
    !uniqueSuggestions.some((s) => s.display_name === query);

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
        <Button
          type="button"
          onClick={onEstimateClick}
          aria-label="Get Instant Estimate"
        >
          Get Instant Estimate
        </Button>
      )}
    </Form>
  );
};

export default AddressInput;
