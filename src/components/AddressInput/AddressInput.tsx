'use client';

import React, { useRef, createRef, useEffect } from 'react';
import { useAddressLookup } from '@hooks/useAddressLookup';
import { useEventLogger } from '@hooks/useEventLogger';
import { useSuggestionNavigation } from '@hooks/useSuggestionNavigation';
import { useInputState } from '@hooks/useInputState';
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
      options?: { toMixpanel?: boolean; toFirestore?: boolean }
    ) => void;
    selectedSuggestion?: AddressSuggestion;
  };
  logEvent?: (
    eventName: string,
    data: Record<string, string | number | boolean | string[]>,
    options?: { toMixpanel?: boolean; toFirestore?: boolean }
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

  // Use our new hook to manage UI state
  const {
    showLoading,
    showErrorAlert,
    showSuggestions,
    showClearButton,
    showEstimateButton,
    uniqueSuggestions
  } = useInputState(query, suggestions, isFetching, hasFetched, locked);

  const createAddressPayload = (
    suggestionId: number,
    confirmedIntent = false
  ) => {
    const fullData = getSuggestionData(
      suggestionId
    ) as EnrichedAddressSuggestion;

    if (!fullData) {
      return null;
    }

    const lat = fullData.lat ? parseFloat(String(fullData.lat)) : 0;
    const lon = fullData.lon ? parseFloat(String(fullData.lon)) : 0;

    return {
      id: fullData.place_id,
      address: fullData.display_name,
      lat,
      lon,
      boundingbox: fullData.boundingbox || [],
      confirmedIntent
    };
  };

  const logAddressEvent = (
    suggestion: AddressSuggestion,
    eventName: string,
    confirmedIntent = false
  ) => {
    if (logEvent) {
      const payload = createAddressPayload(
        suggestion.place_id,
        confirmedIntent
      );
      if (payload) {
        logEvent(eventName, payload, {
          toMixpanel: true,
          toFirestore: true
        });
      }
    }
  };

  const onSelect = (suggestion: AddressSuggestion) => {
    handleSelect(suggestion.display_name);
    selectedSuggestion.current = suggestion;
    logAddressEvent(suggestion, 'Address Selected');
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

    logAddressEvent(matched, 'Request Estimate', true);
  };

  useEffect(() => {
    suggestionRefs.current = uniqueSuggestions.map(
      (_, i) => suggestionRefs.current[i] ?? createRef<HTMLLIElement>()
    );
  }, [uniqueSuggestions]);

  const { handleInputKeyDown, handleSuggestionKeyDown } =
    useSuggestionNavigation(inputRef, onSelect, suggestionRefs.current);

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
        {showLoading && (
          <motion.div
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: 'linear', duration: 0.8 }}
          />
        )}
        {showClearButton && (
          <IconButton
            aria-label="Change Address"
            onClick={() => handleChange('')}
          >
            ×
          </IconButton>
        )}
      </div>
      {showErrorAlert && (
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
      {showEstimateButton && (
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
