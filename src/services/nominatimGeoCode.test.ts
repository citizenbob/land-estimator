import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCoordinatesFromAddress,
  getNominatimSuggestions
} from '@services/nominatimGeoCode';
import { GeocodeResult } from '@typez/addressMatchTypes';
import {
  mockAddresses,
  mockNominatimResponses,
  mockSpringfieldApiResponse,
  mockSpringfieldSuggestions
} from '@lib/testData';
import {
  mockSuccessResponse,
  mockErrorResponse,
  mockNetworkError,
  setupConsoleMocks
} from '@lib/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('nominatimGeoCode Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConsoleMocks();
  });

  afterEach(() => {});

  describe('getCoordinatesFromAddress', () => {
    const mockAddress = mockAddresses.google;
    const mockNominatimResponse = [mockNominatimResponses[0]];
    const expectedResult: GeocodeResult = {
      lat: '37.422',
      lon: '-122.084',
      displayName: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      label: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      value: '37.422,-122.084'
    };

    it('should return coordinates for a valid address', async () => {
      mockSuccessResponse(mockFetch, mockNominatimResponse);

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
      mockSuccessResponse(mockFetch, []);

      const result = await getCoordinatesFromAddress('NonExistentAddress');

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        'No results found for: NonExistentAddress'
      );
    });

    it('should return null if the response data is incomplete', async () => {
      mockSuccessResponse(mockFetch, [{ lat: '37.422' }]);

      const result = await getCoordinatesFromAddress(mockAddress);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        `Incomplete data for address: ${mockAddress}`
      );
    });

    it('should return null and log error if fetch fails', async () => {
      mockNetworkError(mockFetch, 'Network error');

      const result = await getCoordinatesFromAddress(mockAddress);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching coordinates for "${mockAddress}":`,
        expect.any(Error)
      );
    });

    it('should return null and log error if response is not ok', async () => {
      mockErrorResponse(mockFetch, 500, 'Internal Server Error');

      const result = await getCoordinatesFromAddress(mockAddress);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching coordinates for "${mockAddress}":`,
        expect.any(Error)
      );
    });

    it('should return null and log error if response format is invalid', async () => {
      mockSuccessResponse(mockFetch, {});

      const result = await getCoordinatesFromAddress(mockAddress);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching coordinates for "${mockAddress}":`,
        expect.any(Error)
      );
    });
  });

  describe('getNominatimSuggestions', () => {
    const mockQuery = 'Springfield';

    it('should return suggestions for a valid query', async () => {
      mockSuccessResponse(mockFetch, mockSpringfieldApiResponse);

      const result = await getNominatimSuggestions(mockQuery);

      expect(result).toEqual(mockSpringfieldSuggestions);
      const expectedUrl = `https://nominatim.openstreetmap.org/search?q=${mockQuery}&format=json&addressDetails=1&limit=5`;
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, {
        headers: { 'User-Agent': 'land-estimator-app' }
      });
    });

    it('should return an empty array if fetch fails', async () => {
      mockNetworkError(mockFetch);

      const result = await getNominatimSuggestions(mockQuery);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching address suggestions for "${mockQuery}":`,
        expect.any(Error)
      );
    });

    it('should return an empty array if response is not ok', async () => {
      mockErrorResponse(mockFetch, 404, 'Not Found');

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
