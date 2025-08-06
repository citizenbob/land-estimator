import { GET } from './route';
import { getParcelMetadata } from '@services/parcelMetadata';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestSuite } from '@lib/testUtils';

vi.mock('@services/parcelMetadata', () => ({
  getParcelMetadata: vi.fn()
}));

const mockGetParcelMetadata = vi.mocked(getParcelMetadata);

describe('/api/parcel-metadata/[id] route', () => {
  const testSuite = createTestSuite();

  beforeEach(() => {
    testSuite.beforeEachSetup();
  });

  afterEach(() => {
    testSuite.afterEachCleanup();
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
      expect(data).toEqual({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining(
            'Parcel metadata service is disabled'
          ),
          code: 'PARCEL_FETCH_ERROR',
          status: 500
        }),
        timestamp: expect.any(String)
      });
      expect(mockGetParcelMetadata).toHaveBeenCalledWith('test-id');

      consoleErrorSpy.mockRestore();
    });

    it('should return 400 when parcel id is missing', async () => {
      const request = createMockRequest();
      const params = { params: Promise.resolve({ id: '' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: expect.objectContaining({
          message: 'Missing parcel id',
          code: 'MISSING_PARCEL_ID',
          status: 400
        }),
        timestamp: expect.any(String)
      });
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
      expect(data).toEqual({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining(
            'Parcel metadata service is disabled'
          ),
          code: 'PARCEL_FETCH_ERROR',
          status: 500
        }),
        timestamp: expect.any(String)
      });
      expect(mockGetParcelMetadata).toHaveBeenCalledWith('123');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Error]',
        expect.objectContaining({
          message:
            'Parcel metadata service is disabled. Use the simplified address lookup instead.',
          severity: 'medium'
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
      expect(data).toEqual({
        success: false,
        error: expect.objectContaining({
          message: 'Missing parcel id',
          code: 'MISSING_PARCEL_ID',
          status: 400
        }),
        timestamp: expect.any(String)
      });
    });
  });
});
