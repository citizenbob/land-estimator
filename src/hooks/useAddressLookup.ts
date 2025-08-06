// src/hooks/useAddressLookup.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { getNominatimSuggestions } from '@services/nominatimGeoCode';
import { getAvailableAddresses } from '@services/parcelEstimationService';

export const useAddressLookup = () => {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<
    { label?: string; value: string; displayName: string }[]
  >([]);
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
        // Try external API first
        const results = await getNominatimSuggestions(value);
        if (results && results.length > 0) {
          setSuggestions(results);
        } else {
          // Fall back to mock data
          const mockAddresses = getAvailableAddresses();
          const filteredMock = mockAddresses
            .filter(address => 
              address.toLowerCase().includes(value.toLowerCase())
            )
            .slice(0, 5)
            .map(address => ({
              displayName: address,
              label: address,
              value: address,
              latitude: 38.6272,
              longitude: -90.1978
            }));
          setSuggestions(filteredMock);
        }
      } catch {
        // Fall back to mock data on error
        const mockAddresses = getAvailableAddresses();
        const filteredMock = mockAddresses
          .filter(address => 
            address.toLowerCase().includes(value.toLowerCase())
          )
          .slice(0, 5)
          .map(address => ({
            displayName: address,
            label: address,
            value: address,
            latitude: 38.6272,
            longitude: -90.1978
          }));
        setSuggestions(filteredMock);
        if (filteredMock.length === 0) {
          setError('No addresses found. Try one of our sample addresses.');
        }
      } finally {
        setIsFetching(false);
        setHasFetched(true);
      }
    },
    [locked]
  );
        setError('Failed to fetch suggestions. Please try again.');
      } finally {
        setIsFetching(false);
        setHasFetched(true);
      }
    },
    [locked]
  );

  useEffect(() => {
    if (locked || !query.trim()) {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      setSuggestions([]);
      setError(null);
      if (!query.trim()) setHasFetched(false);
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
