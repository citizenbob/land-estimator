import { GET } from './route';
import { getParcelMetadata } from '@services/parcelMetadata';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

  describe('GET', () => {
    it('should return 500 when service is disabled', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockGetParcelMetadata.mockRejectedValue(
        new Error(
          'Parcel metadata service is disabled. Use the simplified address lookup instead.'
        )
      );

      const request = createMockRequest();
      const params = { params: Promise.resolve({ id: 'test-id' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch parcel metadata' });
      expect(mockGetParcelMetadata).toHaveBeenCalledWith('test-id');

      consoleErrorSpy.mockRestore();
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
        new Error(
          'Parcel metadata service is disabled. Use the simplified address lookup instead.'
        )
      );

      const request = createMockRequest();
      const params = { params: Promise.resolve({ id: '123' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch parcel metadata' });
      expect(mockGetParcelMetadata).toHaveBeenCalledWith('123');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in parcel metadata API:',
        expect.objectContaining({
          message:
            'Parcel metadata service is disabled. Use the simplified address lookup instead.'
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
