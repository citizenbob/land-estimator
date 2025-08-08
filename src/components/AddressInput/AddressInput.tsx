'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAddressLookup } from '@hooks/useAddressLookup';
import { useEventLogger } from '@hooks/useEventLogger';
import { useAddressEventLogger } from '@hooks/useAddressEventLogger';
import { useKeyboardNavigation } from '@hooks/useKeyboardNavigation';
import { useElementRefs } from '@hooks/useElementRefs';
import { useInputState } from '@hooks/useInputState';
import InputField from '@components/InputField/InputField';
import IconButton from '@components/IconButton/IconButton';
import Button from '@components/Button/Button';
import SuggestionsList from '@components/SuggestionsList/SuggestionsList';
import Alert from '@components/Alert/Alert';
import { LoadingSpinner } from '@components/LoadingSpinner/LoadingSpinner';
import { Form } from '@components/AddressInput/AddressInput.styles';
import {
  AddressSuggestion,
  EnrichedAddressSuggestion
} from '@app-types/localAddressTypes';
import { EventMap, LogOptions } from '@app-types/analytics';
import { AnimatePresence } from 'framer-motion';
import {
  createEnrichedAddressSuggestion,
  fetchParcelMetadata
} from '@lib/addressDataUtils';

interface AddressInputProps {
  onAddressSelect?: (payload: EnrichedAddressSuggestion) => void;
  mockLookup?: Partial<ReturnType<typeof useAddressLookup>> & {
    logEvent?: <T extends keyof EventMap>(
      eventName: T,
      data: EventMap[T],
      options?: LogOptions
    ) => void;
    selectedSuggestion?: AddressSuggestion;
  };
  logEvent?: <T extends keyof EventMap>(
    eventName: T,
    data: EventMap[T],
    options?: LogOptions
  ) => void;
}

const AddressInput = ({
  mockLookup,
  logEvent: logEventProp,
  onAddressSelect
}: AddressInputProps) => {
  const defaultLookup = useAddressLookup();
  const {
    query,
    suggestions,
    handleChange,
    handleSelect,
    handleClear,
    isFetching,
    locked,
    hasFetched,
    getSuggestionData,
    selectedSuggestion: mockSelectedSuggestion
  } = { ...defaultLookup, ...mockLookup };

  const { logEvent: logEventHook } = useEventLogger();
  const logEvent = logEventProp || logEventHook;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLFormElement | null>(null);
  const selectedSuggestion = useRef<AddressSuggestion | null>(
    mockSelectedSuggestion || null
  );

  const [isEstimateLoading, setIsEstimateLoading] = useState(false);

  const {
    showLoading,
    showErrorAlert,
    showSuggestions,
    showClearButton,
    showEstimateButton,
    uniqueSuggestions
  } = useInputState(query, suggestions, isFetching, hasFetched, locked);

  // Close suggestions function
  const closeSuggestions = useCallback(() => {
    if (showSuggestions) {
      handleSelect(query);
    }
  }, [showSuggestions, query, handleSelect]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        showSuggestions
      ) {
        closeSuggestions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions, closeSuggestions]);

  const { elementRefs: suggestionRefs, getElementRefs: getSuggestionRefs } =
    useElementRefs<HTMLLIElement>(uniqueSuggestions.length);
  const { logAddressEvent } = useAddressEventLogger(
    logEvent,
    query,
    suggestions
  );

  const onSelect = (suggestion: AddressSuggestion) => {
    handleSelect(suggestion.display_name);
    selectedSuggestion.current = suggestion;
    logAddressEvent(suggestion, 'address_selected');
  };

  const { handleTriggerKeyDown: originalInputKeyDown, handleElementKeyDown } =
    useKeyboardNavigation(
      inputRef,
      (index: number) => {
        const suggestion = uniqueSuggestions[index];
        if (suggestion) {
          onSelect(suggestion);
        }
      },
      getSuggestionRefs
    );

  // Wrapper to match SuggestionsList expected signature
  const handleSuggestionKeyDown = (
    e: React.KeyboardEvent<HTMLLIElement>,
    suggestion: AddressSuggestion,
    index: number
  ) => {
    handleElementKeyDown(e, index);
  };

  // Enhanced keyboard handling for input with Escape support
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && showSuggestions) {
      e.preventDefault();
      closeSuggestions();
      return;
    }

    originalInputKeyDown(e);
  };

  const onEstimateClick = async () => {
    let matched = selectedSuggestion.current;
    if (!matched && suggestions.length > 0) {
      matched =
        suggestions.find((s) => s.display_name === query) || suggestions[0];
      selectedSuggestion.current = matched;
    }

    if (!matched || !onAddressSelect) {
      return;
    }

    logAddressEvent(matched, 'estimate_button_clicked');
    setIsEstimateLoading(true);

    try {
      // Try to fetch from API first
      const parcelData = await fetchParcelMetadata(matched.place_id);

      if (parcelData) {
        const enrichedData = createEnrichedAddressSuggestion(
          matched,
          parcelData
        );
        onAddressSelect(enrichedData);
        return;
      }

      // Fallback to local suggestion data
      const rawData = await getSuggestionData(matched.place_id);
      if (rawData) {
        const enrichedData = createEnrichedAddressSuggestion(matched, rawData);
        onAddressSelect(enrichedData);
      }
    } catch (error) {
      console.error('Error in onEstimateClick:', error);
    } finally {
      setIsEstimateLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <Form ref={containerRef} onSubmit={handleSubmit}>
      <div className="relative input-group">
        <InputField
          ref={inputRef}
          type="text"
          placeholder="Enter address"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        <AnimatePresence>{showLoading && <LoadingSpinner />}</AnimatePresence>
        {showClearButton && (
          <IconButton
            type="button"
            aria-label="Change Address"
            tabIndex={0}
            onClick={() => {
              handleClear();
              selectedSuggestion.current = null;
            }}
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
          suggestionRefs={suggestionRefs}
          onSuggestionKeyDown={handleSuggestionKeyDown}
        />
      )}
      {showEstimateButton && (
        <div className="flex justify-start">
          <Button
            type="button"
            onClick={onEstimateClick}
            loading={isEstimateLoading}
            disabled={isEstimateLoading}
            aria-label="Get Instant Estimate"
          >
            {isEstimateLoading ? 'Calculating...' : 'Get Instant Estimate'}
          </Button>
        </div>
      )}
    </Form>
  );
};

export default AddressInput;
