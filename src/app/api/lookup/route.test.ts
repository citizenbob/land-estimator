import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import * as addressSearch from '@services/addressSearch';
import { MOCK_ADDRESS_LOOKUP_DATA } from '@lib/testData';

vi.mock('@services/addressSearch');
const mockSearchAddresses = vi.mocked(addressSearch.searchAddresses);

function createRequest(query?: string): NextRequest {
  const url = query
    ? `http://localhost:3000/api/lookup?query=${encodeURIComponent(query)}`
    : 'http://localhost:3000/api/lookup';

  return new NextRequest(url);
}

describe('/api/lookup route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Valid requests', () => {
    it('should return successful response with results', async () => {
      const mockResults = MOCK_ADDRESS_LOOKUP_DATA.slice(0, 1);

      mockSearchAddresses.mockResolvedValue(mockResults);

      const request = createRequest('test address');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        query: 'test address',
        results: mockResults,
        count: 1
      });
      expect(mockSearchAddresses).toHaveBeenCalledWith('test address', 10);
    });

    it('should trim whitespace from query', async () => {
      const mockResults: addressSearch.AddressLookupRecord[] = [];
      mockSearchAddresses.mockResolvedValue(mockResults);

      const request = createRequest('  padded query  ');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe('padded query');
      expect(mockSearchAddresses).toHaveBeenCalledWith('padded query', 10);
    });

    it('should return empty results when no matches found', async () => {
      mockSearchAddresses.mockResolvedValue([]);

      const request = createRequest('nonexistent address');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        query: 'nonexistent address',
        results: [],
        count: 0
      });
    });

    it('should handle multiple results', async () => {
      const mockResults = MOCK_ADDRESS_LOOKUP_DATA.slice(0, 2);

      mockSearchAddresses.mockResolvedValue(mockResults);

      const request = createRequest('main street');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(2);
      expect(data.count).toBe(2);
    });
  });

  describe('Invalid requests - missing or invalid query', () => {
    it('should return 400 for missing query parameter', async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Query parameter must be at least 3 characters'
      });
      expect(mockSearchAddresses).not.toHaveBeenCalled();
    });

    it('should return 400 for empty query parameter', async () => {
      const request = createRequest('');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Query parameter must be at least 3 characters'
      });
      expect(mockSearchAddresses).not.toHaveBeenCalled();
    });

    it('should return 400 for query with only whitespace', async () => {
      const request = createRequest('   ');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Query parameter must be at least 3 characters'
      });
      expect(mockSearchAddresses).not.toHaveBeenCalled();
    });

    it('should return 400 for single character query', async () => {
      const request = createRequest('a');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Query parameter must be at least 3 characters'
      });
      expect(mockSearchAddresses).not.toHaveBeenCalled();
    });

    it('should return 400 for two character query', async () => {
      const request = createRequest('ab');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Query parameter must be at least 3 characters'
      });
      expect(mockSearchAddresses).not.toHaveBeenCalled();
    });

    it('should accept exactly 3 character query', async () => {
      mockSearchAddresses.mockResolvedValue([]);

      const request = createRequest('abc');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearchAddresses).toHaveBeenCalledWith('abc', 10);
    });
  });

  describe('Error handling', () => {
    it('should return 500 when addressSearch service throws an error', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockSearchAddresses.mockRejectedValue(new Error('Service unavailable'));

      const request = createRequest('test query');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Internal server error'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Error]',
        expect.objectContaining({
          message: 'Service unavailable',
          context: expect.objectContaining({
            operation: 'api_lookup',
            endpoint: '/api/lookup',
            query: 'test query'
          })
        })
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle service timeout errors gracefully', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      mockSearchAddresses.mockRejectedValue(
        new Error('Search timeout - index may be loading')
      );

      const request = createRequest('timeout test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe('timeout test');
      expect(data.results).toEqual([]);
      expect(data.count).toBe(0);
      expect(data.message).toBe(
        'Search index is initializing. Please try again in a moment.'
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Query parameter handling', () => {
    it('should handle special characters in query', async () => {
      mockSearchAddresses.mockResolvedValue([]);

      const specialQuery = 'café & restaurant #1';
      const request = createRequest(specialQuery);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe(specialQuery);
      expect(mockSearchAddresses).toHaveBeenCalledWith(specialQuery, 10);
    });

    it('should handle Unicode characters in query', async () => {
      mockSearchAddresses.mockResolvedValue([]);

      const unicodeQuery = 'Москва, Россия';
      const request = createRequest(unicodeQuery);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe(unicodeQuery);
      expect(mockSearchAddresses).toHaveBeenCalledWith(
        unicodeQuery.toLowerCase(),
        10
      );
    });

    it('should handle very long queries', async () => {
      mockSearchAddresses.mockResolvedValue([]);

      const longQuery = 'a'.repeat(500);
      const request = createRequest(longQuery);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe(longQuery);
      expect(mockSearchAddresses).toHaveBeenCalledWith(longQuery, 10);
    });
  });

  describe('Response format validation', () => {
    it('should always include required response fields', async () => {
      const mockResults = [MOCK_ADDRESS_LOOKUP_DATA[0]];

      mockSearchAddresses.mockResolvedValue(mockResults);

      const request = createRequest('test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('query');
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('count');
      expect(typeof data.query).toBe('string');
      expect(Array.isArray(data.results)).toBe(true);
      expect(typeof data.count).toBe('number');
    });

    it('should maintain consistent response structure for empty results', async () => {
      mockSearchAddresses.mockResolvedValue([]);

      const request = createRequest('empty');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('query', 'empty');
      expect(data).toHaveProperty('results', []);
      expect(data).toHaveProperty('count', 0);
    });
  });

  describe('Integration with addressSearch service', () => {
    it('should pass correct limit parameter to searchAddresses', async () => {
      mockSearchAddresses.mockResolvedValue([]);

      const request = createRequest('test');
      await GET(request);

      expect(mockSearchAddresses).toHaveBeenCalledWith('test', 10);
    });

    it('should preserve all result fields from addressSearch service', async () => {
      const mockResult = {
        id: '123',
        display_name: 'Complete Address, City, State, Country',
        region: 'Test Region',
        normalized: 'complete address city state country'
      };

      mockSearchAddresses.mockResolvedValue([mockResult]);

      const request = createRequest('complete');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0]).toEqual(mockResult);
    });
  });
});
