import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNominatimSuggestions } from '@services/nominatimGeoCode';
import { mockSuggestions } from '@lib/testData';
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

  describe('getNominatimSuggestions', () => {
    const mockQuery = 'Springfield';

    it('should return suggestions for a valid query', async () => {
      mockSuccessResponse(mockFetch, mockSuggestions);

      const result = await getNominatimSuggestions(mockQuery);

      expect(result).toEqual(mockSuggestions);
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
