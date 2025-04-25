import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getNominatimSuggestions,
  getCoordinatesFromAddress
} from '@services/nominatimGeoCode';
import {
  MOCK_SUGGESTIONS,
  TEST_LOCATIONS,
  MOCK_NOMINATIM_ERRORS,
  MOCK_NOMINATIM_RESPONSE
} from '@lib/testData';
import {
  mockSuccessResponse,
  mockErrorResponse,
  mockNetworkError,
  mockJsonParsingError,
  setupConsoleMocks
} from '@lib/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper function to modify what the test expects
const expectUrlContainsParams = (url: string, params: string[]): void => {
  params.forEach((param: string) => {
    expect(url).toContain(param);
  });
};

describe('nominatimGeoCode Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConsoleMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNominatimSuggestions', () => {
    const mockQuery = TEST_LOCATIONS.GOOGLE;

    it('should return suggestions for a valid query', async () => {
      mockSuccessResponse(mockFetch, MOCK_SUGGESTIONS);

      const result = await getNominatimSuggestions(mockQuery);

      expect(result).toEqual(MOCK_SUGGESTIONS);

      // Verify call to fetch without strict URL checking
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][1]).toEqual({
        headers: { 'User-Agent': 'land-estimator-app' }
      });

      // Verify URL contains expected parameters
      const url = mockFetch.mock.calls[0][0];
      expectUrlContainsParams(url, [
        'nominatim.openstreetmap.org/search',
        'format=json',
        'addressDetails=1',
        'limit=5'
      ]);
    });

    it('should return an empty array if fetch fails', async () => {
      mockNetworkError(mockFetch, MOCK_NOMINATIM_ERRORS.NETWORK_ERROR.message);

      const result = await getNominatimSuggestions(mockQuery);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching address suggestions for "${mockQuery}":`,
        expect.any(Error)
      );
    });

    it('should return an empty array if response is not ok', async () => {
      mockErrorResponse(
        mockFetch,
        MOCK_NOMINATIM_ERRORS.NOT_FOUND.status,
        MOCK_NOMINATIM_ERRORS.NOT_FOUND.message
      );

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
      mockJsonParsingError(
        mockFetch,
        'Unexpected token I in JSON at position 0'
      );

      const result = await getNominatimSuggestions(mockQuery);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching address suggestions for "${mockQuery}":`,
        expect.any(SyntaxError)
      );
    });
  });

  describe('getCoordinatesFromAddress', () => {
    const address = TEST_LOCATIONS.APPLE;

    it('should return address details for a valid address', async () => {
      mockSuccessResponse(mockFetch, [MOCK_NOMINATIM_RESPONSE]);

      const result = await getCoordinatesFromAddress(address);

      // Test against what the function actually returns (place_id and display_name)
      expect(result).toEqual({
        place_id: MOCK_NOMINATIM_RESPONSE.place_id,
        display_name: MOCK_NOMINATIM_RESPONSE.display_name
      });

      // Verify the URL has the correct parameters without testing exact encoding
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][1]).toEqual({
        headers: { 'User-Agent': 'land-estimator-app' }
      });

      // Verify URL contains expected parameters
      const url = mockFetch.mock.calls[0][0];
      expectUrlContainsParams(url, [
        'nominatim.openstreetmap.org/search',
        'format=json',
        'limit=1'
      ]);
    });

    it('should return null if no results are found', async () => {
      mockSuccessResponse(mockFetch, []);

      const result = await getCoordinatesFromAddress(address);

      expect(result).toBeNull();
    });

    it('should return null if fetch fails', async () => {
      mockNetworkError(mockFetch, MOCK_NOMINATIM_ERRORS.NETWORK_ERROR.message);

      const result = await getCoordinatesFromAddress(address);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching coordinates for "${address}":`,
        expect.any(Error)
      );
    });

    it('should return null if response is not ok', async () => {
      mockErrorResponse(
        mockFetch,
        MOCK_NOMINATIM_ERRORS.SERVER_ERROR.status,
        MOCK_NOMINATIM_ERRORS.SERVER_ERROR.message
      );

      const result = await getCoordinatesFromAddress(address);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        `Error fetching coordinates for "${address}":`,
        expect.any(Error)
      );
    });
  });
});
