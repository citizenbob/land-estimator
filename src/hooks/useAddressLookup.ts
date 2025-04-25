import { useState, useCallback, useEffect, useRef } from 'react';
import { AddressSuggestion, NominatimResponse } from '@typez/addressMatchTypes';

export const useAddressLookup = () => {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [locked, setLocked] = useState<boolean>(false);
  const [ignoreNextChange, setIgnoreNextChange] = useState<boolean>(false);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Store raw suggestion data for later lookup
  const rawDataMap = useRef<Record<number, NominatimResponse>>({});

  const fetchSuggestions = useCallback(
    async (value: string) => {
      if (locked || !value.trim()) {
        setSuggestions([]);
        setIsFetching(false);
        return;
      }
      setIsFetching(true);
      setError(null);
      try {
        // fetch raw NominatimResponse array
        const response = await fetch(
          `/api/nominatim?type=suggestions&query=${encodeURIComponent(value)}`
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const results: NominatimResponse[] = await response.json();
        // populate rawDataMap
        rawDataMap.current = {};
        results.forEach((item) => {
          rawDataMap.current[item.place_id] = item;
        });
        // set minimal suggestions
        setSuggestions(
          results.map((item) => ({
            place_id: item.place_id,
            display_name: item.display_name
          }))
        );
      } catch (err) {
        setSuggestions([]);
        setError('Error fetching suggestions. Please try again.');
        console.error('Error fetching address suggestions:', err);
      } finally {
        setIsFetching(false);
        setHasFetched(true);
      }
    },
    [locked]
  );

  // Retrieve full payload for a suggestion
  const getSuggestionData = useCallback(
    (id: number): NominatimResponse | undefined => rawDataMap.current[id],
    []
  );

  useEffect(() => {
    if (locked || !(query?.trim() ?? '')) {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      setSuggestions([]);
      setError(null);
      if (!(query?.trim() ?? '')) setHasFetched(false);
      return;
    }
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 500);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [query, fetchSuggestions, locked]);

  const handleChange = useCallback(
    (value: string) => {
      if (ignoreNextChange) {
        setIgnoreNextChange(false);
        return;
      }
      setQuery(value);
    },
    [ignoreNextChange]
  );

  const handleSelect = useCallback((value: string) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }
    setQuery(value);
    setSuggestions([]);
    setLocked(true);
    setIgnoreNextChange(true);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    error,
    handleChange,
    handleSelect,
    isFetching,
    locked,
    hasFetched,
    getSuggestionData
  };
};
