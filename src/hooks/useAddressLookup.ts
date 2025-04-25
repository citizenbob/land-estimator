import { useState, useEffect, useRef } from 'react';
import { NominatimApiClient } from '@services/nominatimApi';

/**
 * Hook that manages address lookup functionality
 *
 * Provides stateful management of address search queries, suggestions retrieval,
 * and selection. Handles API communication with throttling, error handling,
 * and maintains the raw suggestion data for later reference.
 *
 * @returns Object containing the address lookup state and handler functions
 */
export function useAddressLookup() {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<
    { place_id: number; display_name: string }[]
  >([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [locked, setLocked] = useState<boolean>(false);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const rawDataRef = useRef<
    Record<number, { place_id: number; display_name: string }>
  >({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (value: string) => {
    if (locked) return;
    setQuery(value);
    setSuggestions([]);
    setError(null);
    setHasFetched(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsFetching(true);

    timerRef.current = setTimeout(async () => {
      if (!value) {
        setIsFetching(false);
        return;
      }
      try {
        const data = await NominatimApiClient.fetchSuggestions(value);
        type Suggestion = { place_id: number; display_name: string };
        const simplified = (data as Suggestion[]).map((item) => {
          rawDataRef.current[item.place_id] = item;
          return {
            place_id: item.place_id,
            display_name: item.display_name
          };
        });
        setSuggestions(simplified);
        setHasFetched(true);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
        setSuggestions([]);
        setHasFetched(true);
      } finally {
        setIsFetching(false);
      }
    }, 600);
  };

  const handleSelect = (selected: string) => {
    setQuery(selected);
    setSuggestions([]);
    setLocked(true);
  };

  const getSuggestionData = (id: number) => {
    return rawDataRef.current[id];
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    query,
    suggestions,
    isFetching,
    locked,
    hasFetched,
    error,
    handleChange,
    handleSelect,
    getSuggestionData
  };
}
