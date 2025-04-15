// src/hooks/useAddressLookup.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { getNominatimSuggestions } from '@services/nominatimGeoCode';
import { Suggestion } from '@typez/addressMatchTypes';

export const useAddressLookup = () => {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [locked, setLocked] = useState<boolean>(false);
  const [ignoreNextChange, setIgnoreNextChange] = useState<boolean>(false);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

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
        const results = await getNominatimSuggestions(value);
        const transformedResults = results.map((result) => ({
          displayName: result.displayName,
          label: result.label,
          latitude: result.latitude,
          longitude: result.longitude,
          value: result.displayName
        }));
        setSuggestions(transformedResults || []);
      } catch {
        setSuggestions([]);
        setError('Failed to fetch suggestions. Please try again.');
      } finally {
        setIsFetching(false);
        setHasFetched(true);
      }
    },
    [locked]
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
    hasFetched
  };
};
