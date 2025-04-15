import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCoordinatesFromAddress,
  getNominatimSuggestions
} from '@services/nominatimGeoCode';
import { GeocodeResult, Suggestion } from '@typez/addressMatchTypes';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('nominatimGeoCode Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {});

  describe('getCoordinatesFromAddress', () => {
    const mockAddress = '1600 Amphitheatre Parkway, Mountain View, CA';
    const mockNominatimResponse = [
      {
        latitude: '37.422',
        longitude: '-122.084',
        display_name: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA'
      }
    ];
    const expectedResult: GeocodeResult = {
      latitude: '37.422',
      longitude: '-122.084',
      displayName: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      label: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      value: '37.422,-122.084'
    };

    it('should return coordinates for a valid address', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResponse
      });

      const result = await getCoordinatesFromAddress(mockAddress);

      expect(result).toEqual(expectedResult);
      const encodedAddress = mockAddress
        .replace(/ /g, '+')
        .replace(/,/g, '%2C');
      const expectedUrl = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&addressDetails=1&limit=1`;
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, {
        headers: { 'User-Agent': 'land-estimator-app' }
      });
    });

    it('should return null if no results are found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const result = await getCoordinatesFromAddress('NonExistentAddress');

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        'No results found for: NonExistentAddress'
      );
    });

    it('should return null if the response data is incomplete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ latitude: '37.422' }]
      });

      const result = await getCoordinatesFromAddress(mockAddress);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        `Incomplete data for address: ${mockAddress}`
      );
    });

    it('should return null and log error if fetch fails', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);

      const result = await getCoordinatesFromAddress(mockAddress);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching coordinates for "${mockAddress}":`,
        error
      );
    });

    it('should return null and log error if response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await getCoordinatesFromAddress(mockAddress);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching coordinates for "${mockAddress}":`,
        new Error('Nominatim API error: 500 Internal Server Error')
      );
    });

    it('should return null and log error if response format is invalid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const result = await getCoordinatesFromAddress(mockAddress);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching coordinates for "${mockAddress}":`,
        new Error('Invalid response format')
      );
    });
  });

  describe('getNominatimSuggestions', () => {
    const mockQuery = 'Springfield';
    const mockApiResponse = [
      {
        display_name: 'Springfield, IL, USA',
        latitude: '39.7817',
        longitude: '-89.6501'
      },
      {
        display_name: 'Springfield, MA, USA',
        latitude: '42.1015',
        longitude: '-72.5898'
      }
    ];
    const expectedSuggestions: Suggestion[] = [
      {
        displayName: 'Springfield, IL, USA',
        label: 'Springfield, IL, USA',
        latitude: '39.7817',
        longitude: '-89.6501',
        value: 'Springfield, IL, USA'
      },
      {
        displayName: 'Springfield, MA, USA',
        label: 'Springfield, MA, USA',
        latitude: '42.1015',
        longitude: '-72.5898',
        value: 'Springfield, MA, USA'
      }
    ];

    it('should return suggestions for a valid query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      const result = await getNominatimSuggestions(mockQuery);

      expect(result).toEqual(expectedSuggestions);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://nominatim.openstreetmap.org/search?q=${mockQuery}&format=json`
      );
    });

    it('should return an empty array if fetch fails', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);

      const result = await getNominatimSuggestions(mockQuery);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching address suggestions for "${mockQuery}":`,
        error
      );
    });

    it('should return an empty array if response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Not Found' })
      });

      const result = await getNominatimSuggestions(mockQuery);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Error fetching address suggestions for "${mockQuery}":`
        ),
        expect.any(Error)
      );
    });

    it('should return an empty array if response is not valid JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token I in JSON at position 0');
        }
      });

      const result = await getNominatimSuggestions(mockQuery);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching address suggestions for "${mockQuery}":`,
        expect.any(SyntaxError)
      );
    });
  });
});
