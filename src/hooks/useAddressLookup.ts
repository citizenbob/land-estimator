import { useState, useEffect, useRef } from 'react';
import { AddressLookupRecord } from '@services/addressSearch';
import { LocalAddressRecord } from '@typez/localAddressTypes';

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
        const response = await fetch(
          `/api/lookup?query=${encodeURIComponent(value)}`
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch address suggestions: ${response.status} ${response.statusText}`
          );
        }
        const responseData = await response.json();
        console.log('📥 API response:', responseData);

        const results: AddressLookupRecord[] = Array.isArray(responseData)
          ? responseData
          : responseData.results || [];

        const simplified = results.map((item) => {
          rawDataRef.current[item.id] = item;
          return {
            place_id: item.id,
            display_name: item.display_name
          };
        });
        setSuggestions(simplified);
        setHasFetched(true);
      } catch (err: unknown) {
        console.error('Failed to fetch or process address suggestions:', err);
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
      console.error('Failed to fetch parcel metadata for ID:', id, error);
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
