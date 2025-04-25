import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NominatimApiClient } from './nominatimApi';
import {
  MOCK_NOMINATIM_RESPONSE,
  MOCK_NOMINATIM_RESPONSES,
  TEST_LOCATIONS,
  MOCK_NOMINATIM_ERRORS
} from '@lib/testData';
import {
  mockSuccessResponse,
  mockErrorResponse,
  mockNetworkError,
  mockJsonParsingError,
  setupConsoleMocks
} from '@lib/testUtils';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('NominatimApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConsoleMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchSuggestions', () => {
    const query = TEST_LOCATIONS.GOOGLE;

    it('should call the correct API endpoint with encoded query', async () => {
      mockSuccessResponse(mockFetch, MOCK_NOMINATIM_RESPONSES);

      const result = await NominatimApiClient.fetchSuggestions(query);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/nominatim?type=suggestions&query=${encodeURIComponent(query)}`
      );
      expect(result).toEqual(MOCK_NOMINATIM_RESPONSES);
    });

    it('should throw an error if the response is not ok', async () => {
      mockErrorResponse(mockFetch, 500, 'Internal Server Error');

      await expect(NominatimApiClient.fetchSuggestions(query)).rejects.toThrow(
        'Failed to fetch suggestions'
      );
    });

    it('should throw an error if fetch fails', async () => {
      mockNetworkError(mockFetch, MOCK_NOMINATIM_ERRORS.NETWORK_ERROR.message);

      await expect(NominatimApiClient.fetchSuggestions(query)).rejects.toThrow(
        MOCK_NOMINATIM_ERRORS.NETWORK_ERROR.message
      );
    });

    it('should handle JSON parsing errors', async () => {
      mockJsonParsingError(mockFetch, 'Invalid JSON response');

      await expect(NominatimApiClient.fetchSuggestions(query)).rejects.toThrow(
        'Invalid JSON response'
      );
    });
  });

  describe('fetchCoordinates', () => {
    const address = TEST_LOCATIONS.APPLE;

    it('should call the correct API endpoint with encoded address', async () => {
      mockSuccessResponse(mockFetch, MOCK_NOMINATIM_RESPONSE);

      const result = await NominatimApiClient.fetchCoordinates(address);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/nominatim?type=coordinates&address=${encodeURIComponent(address)}`
      );
      expect(result).toEqual(MOCK_NOMINATIM_RESPONSE);
    });

    it('should throw an error if the response is not ok', async () => {
      mockErrorResponse(
        mockFetch,
        MOCK_NOMINATIM_ERRORS.NOT_FOUND.status,
        MOCK_NOMINATIM_ERRORS.NOT_FOUND.message
      );

      await expect(
        NominatimApiClient.fetchCoordinates(address)
      ).rejects.toThrow('Failed to fetch coordinates');
    });

    it('should throw an error if json parsing fails', async () => {
      mockJsonParsingError(mockFetch, 'Invalid JSON syntax');

      await expect(
        NominatimApiClient.fetchCoordinates(address)
      ).rejects.toThrow('Invalid JSON syntax');
    });

    it('should handle network errors', async () => {
      mockNetworkError(mockFetch, 'Network unavailable');

      await expect(
        NominatimApiClient.fetchCoordinates(address)
      ).rejects.toThrow('Network unavailable');
    });
  });
});
