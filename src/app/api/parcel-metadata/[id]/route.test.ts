import { GET } from './route';
import { getParcelMetadata } from '@services/parcelMetadata';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the parcelMetadata service
vi.mock('@services/parcelMetadata', () => ({
  getParcelMetadata: vi.fn()
}));

const mockGetParcelMetadata = vi.mocked(getParcelMetadata);

describe('/api/parcel-metadata/[id] route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (
    url: string = 'http://localhost:3000/api/parcel-metadata/123'
  ) => {
    return new NextRequest(url);
  };

  const mockParcelData = {
    id: '123',
    full_address: '123 Main St, St. Louis, MO 63101',
    latitude: 38.627,
    longitude: -90.1994,
    region: 'St. Louis City',
    calc: {
      landarea: 5000,
      building_sqft: 1200,
      estimated_landscapable_area: 3800,
      property_type: 'residential'
    },
    owner: {
      name: 'John Doe'
    },
    affluence_score: 0.75,
    source_file: 'test',
    processed_date: '2024-01-01T00:00:00.000Z'
  };

  describe('GET', () => {
    it('should return parcel data when parcel exists', async () => {
      mockGetParcelMetadata.mockResolvedValue(mockParcelData);

      const request = createMockRequest();
      const params = { params: Promise.resolve({ id: '123' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockParcelData);
      expect(mockGetParcelMetadata).toHaveBeenCalledWith('123');

      // Check cache headers
      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=3600'
      );
    });

    it('should return 404 when parcel not found', async () => {
      mockGetParcelMetadata.mockResolvedValue(null);

      const request = createMockRequest();
      const params = { params: Promise.resolve({ id: 'nonexistent' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Not found' });
      expect(mockGetParcelMetadata).toHaveBeenCalledWith('nonexistent');
    });

    it('should return 400 when parcel id is missing', async () => {
      const request = createMockRequest();
      const params = { params: Promise.resolve({ id: '' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing parcel id' });
      expect(mockGetParcelMetadata).not.toHaveBeenCalled();
    });

    it('should return 500 when service throws error', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockGetParcelMetadata.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockRequest();
      const params = { params: Promise.resolve({ id: '123' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal error' });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Error]',
        expect.objectContaining({
          message: 'Database connection failed',
          context: expect.objectContaining({
            operation: 'parcel_metadata_lookup',
            parcelId: '123'
          })
        })
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle undefined parcel id', async () => {
      const request = createMockRequest();
      const params = {
        params: Promise.resolve({ id: undefined as unknown as string })
      };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing parcel id' });
    });
  });
});
