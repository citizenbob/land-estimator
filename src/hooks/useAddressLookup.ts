import { useState, useRef } from 'react';
import type {
  AddressLookupRecord,
  LocalAddressRecord
} from '@app-types/localAddressTypes';
import { searchAddresses } from '@services/addressSearch';
import { getErrorMessage, logError } from '@lib/errorUtils';
import { ParcelMetadataResponse } from '@app-types/apiResponseTypes';
import { deduplicatedLookup } from '@lib/requestDeduplication';
import { devLog } from '@lib/logger';
import { transformToSuggestions } from '@lib/addressTransforms';

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
    setQuery(value);
    setSuggestions([]);
    setError(null);
    setHasFetched(false);
    setLocked(false);

    if (!value) {
      setIsFetching(false);
      return;
    }

    if (value.trim().length < 3) {
      setIsFetching(false);
      return;
    }

    setIsFetching(true);

    deduplicatedLookup(
      value,
      async (normalizedQuery) => {
        const results = await searchAddresses(normalizedQuery, 10);
        devLog('📥 Client search results:', results);
        return results;
      },
      { debounce: true, debounceDelay: 200 }
    )
      .then((results) => {
        results.forEach((item) => {
          rawDataRef.current[item.id] = item;
        });
        setSuggestions(transformToSuggestions(results));
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
        const apiResponse: ParcelMetadataResponse = await response.json();

        if (apiResponse.success && apiResponse.data) {
          const parcelMetadata = apiResponse.data;
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
      } else {
        // Handle error response
        const errorResponse = await response.json();
        logError(new Error(`API Error: ${response.status}`), {
          operation: 'parcel_metadata_fetch',
          parcelId: id,
          statusCode: response.status,
          errorResponse
        });
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
