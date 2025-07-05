import { useState, useRef } from 'react';
import { AddressLookupRecord } from '@services/addressSearch';
import { LocalAddressRecord } from '@app-types';
import { createNetworkError, getErrorMessage, logError } from '@lib/errorUtils';
import { deduplicatedLookup } from '@lib/requestDeduplication';
import { devLog } from '@lib/logger';

export function useAddressLookup() {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<
    { place_id: string; display_name: string }[]
  >([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [locked, setLocked] = useState<boolean>(false);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const rawDataRef = useRef<Record<string, AddressLookupRecord>>({});

  const handleChange = (value: string) => {
    if (locked) return;
    setQuery(value);
    setSuggestions([]);
    setError(null);
    setHasFetched(false);

    if (!value) {
      setIsFetching(false);
      return;
    }

    // Don't search for queries shorter than 3 characters
    if (value.trim().length < 3) {
      setIsFetching(false);
      return;
    }

    setIsFetching(true);

    /**
     * Use deduplication utility for debounced, deduplicated lookups
     */
    deduplicatedLookup(
      value,
      async (normalizedQuery) => {
        const response = await fetch(
          `/api/lookup?query=${encodeURIComponent(normalizedQuery)}`
        );
        if (!response.ok) {
          throw createNetworkError(
            `Failed to fetch address suggestions: ${response.status} ${response.statusText}`,
            { status: response.status, statusText: response.statusText }
          );
        }
        const responseData = await response.json();
        devLog('📥 API response:', responseData);

        const results: AddressLookupRecord[] = Array.isArray(responseData)
          ? responseData
          : responseData.results || [];

        return results;
      },
      { debounce: true, debounceDelay: 200 }
    )
      .then((results) => {
        /**
         * Only update state if this query is still current
         */
        const simplified = results.map((item) => {
          rawDataRef.current[item.id] = item;
          return {
            place_id: item.id,
            display_name: item.display_name
          };
        });
        setSuggestions(simplified);
        setHasFetched(true);
      })
      .catch((err: unknown) => {
        logError(err, {
          operation: 'address_lookup',
          query: value
        });
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        setSuggestions([]);
        setHasFetched(true);
      })
      .finally(() => {
        setIsFetching(false);
      });
  };

  const handleSelect = (selected: string) => {
    setQuery(selected);
    setSuggestions([]);
    setLocked(true);
  };

  /**
   * Clear the input and reset all state
   */
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setLocked(false);
    setIsFetching(false);
    setHasFetched(false);
    setError(null);
  };

  const getSuggestionData = async (
    id: string
  ): Promise<LocalAddressRecord | undefined> => {
    const record = rawDataRef.current[id];
    if (!record) return undefined;

    try {
      const response = await fetch(`/api/parcel-metadata/${id}`);

      if (response.ok) {
        const parcelMetadata = await response.json();

        if (parcelMetadata) {
          return {
            id: parcelMetadata.id,
            full_address: record.display_name,
            region: parcelMetadata.region,
            latitude: parcelMetadata.latitude,
            longitude: parcelMetadata.longitude,
            calc: parcelMetadata.calc,
            owner: parcelMetadata.owner || {
              name: 'Unknown'
            },
            affluence_score: parcelMetadata.affluence_score || 0,
            source_file: parcelMetadata.source_file || 'Unknown',
            processed_date:
              parcelMetadata.processed_date || new Date().toISOString()
          };
        }
      }
    } catch (error) {
      logError(error, {
        operation: 'parcel_metadata_fetch',
        id
      });
    }

    return {
      id: record.id,
      full_address: record.display_name,
      region: record.region,
      latitude: 0,
      longitude: 0,
      calc: {
        landarea: 0,
        building_sqft: 0,
        estimated_landscapable_area: 0,
        property_type: 'unknown'
      },
      owner: {
        name: 'Unknown'
      },
      affluence_score: 0,
      source_file: 'Unknown',
      processed_date: new Date().toISOString()
    };
  };

  return {
    query,
    suggestions,
    isFetching,
    locked,
    hasFetched,
    error,
    handleChange,
    handleSelect,
    handleClear,
    getSuggestionData
  };
}
