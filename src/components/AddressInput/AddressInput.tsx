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
import {
  AddressSelectedEvent,
  EstimateButtonClickedEvent,
  EventMap,
  LogOptions
} from '@typez/analytics';
import { motion } from 'framer-motion';

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

  const {
    showLoading,
    showErrorAlert,
    showSuggestions,
    showClearButton,
    showEstimateButton,
    uniqueSuggestions
  } = useInputState(query, suggestions, isFetching, hasFetched, locked);

  const logAddressEvent = (
    suggestion: AddressSuggestion,
    eventType: 'address_selected' | 'estimate_button_clicked'
  ) => {
    if (logEvent && suggestion) {
      if (eventType === 'address_selected') {
        const addressSelectedEvent: AddressSelectedEvent = {
          query: query,
          address_id: suggestion.place_id.toString(),
          position_in_results: suggestions.findIndex(
            (s) => s.place_id === suggestion.place_id
          )
        };
        logEvent('address_selected', addressSelectedEvent);
      } else if (eventType === 'estimate_button_clicked') {
        const estimateEvent: EstimateButtonClickedEvent = {
          address_id: suggestion.place_id.toString()
        };
        logEvent('estimate_button_clicked', estimateEvent);
      }
    }
  };

  const onSelect = (suggestion: AddressSuggestion) => {
    handleSelect(suggestion.display_name);
    selectedSuggestion.current = suggestion;
    logAddressEvent(suggestion, 'address_selected');
  };

  const onEstimateClick = async () => {
    let matched = selectedSuggestion.current;
    if (!matched && suggestions.length > 0) {
      matched =
        suggestions.find((s) => s.display_name === query) || suggestions[0];
      selectedSuggestion.current = matched;
    }

    if (!matched) {
      return;
    }

    logAddressEvent(matched, 'estimate_button_clicked');

    // Use API route instead of client-side parcel metadata loading
    try {
      const response = await fetch(`/api/parcel-metadata/${matched.place_id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch parcel data: ${response.status}`);
      }

      const rawData = await response.json();

      if (rawData && onAddressSelect) {
        const enrichedData: EnrichedAddressSuggestion = {
          place_id: matched.place_id,
          display_name: matched.display_name,
          latitude: rawData.latitude,
          longitude: rawData.longitude,
          region: rawData.region || 'Unknown',
          calc: {
            landarea: rawData.calc.landarea,
            building_sqft: rawData.calc.building_sqft,
            estimated_landscapable_area:
              rawData.calc.estimated_landscapable_area,
            property_type: rawData.calc.property_type
          },
          affluence_score: rawData.affluence_score
        };
        onAddressSelect(enrichedData);
      }
    } catch (error) {
      console.error('Error fetching parcel metadata:', error);
      const rawData = await getSuggestionData(matched.place_id);
      if (rawData && onAddressSelect) {
        const enrichedData: EnrichedAddressSuggestion = {
          place_id: matched.place_id,
          display_name: matched.display_name,
          latitude: rawData.latitude,
          longitude: rawData.longitude,
          region: rawData.region || 'Unknown',
          calc: {
            landarea: rawData.calc.landarea,
            building_sqft: rawData.calc.building_sqft,
            estimated_landscapable_area:
              rawData.calc.estimated_landscapable_area,
            property_type: rawData.calc.property_type
          },
          affluence_score: rawData.affluence_score
        };
        onAddressSelect(enrichedData);
      }
    }
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
