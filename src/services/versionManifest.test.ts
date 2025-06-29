import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getVersionManifest,
  getCurrentVersion,
  getPreviousVersion,
  clearVersionManifestCache
} from './versionManifest';
import { MOCK_VERSION_MANIFEST } from '@lib/testData';
import {
  createMockFetch,
  mockSuccessResponse,
  setupConsoleMocks
} from '@lib/testUtils';

const mockFetch = createMockFetch();

describe('versionManifest service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearVersionManifestCache();
    setupConsoleMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getVersionManifest', () => {
    it('should fetch and return version manifest successfully', async () => {
      mockSuccessResponse(mockFetch, MOCK_VERSION_MANIFEST);

      const result = await getVersionManifest();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://storage.googleapis.com/land-estimator-29ee9.firebasestorage.app/cdn/version-manifest.json',
        expect.objectContaining({
          cache: 'no-cache',
          headers: expect.objectContaining({
            'Cache-Control': 'no-cache, must-revalidate'
          })
        })
      );
      expect(result).toEqual(MOCK_VERSION_MANIFEST);
    });

    it('should cache manifest and reuse cached version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(MOCK_VERSION_MANIFEST)
      });

      const result1 = await getVersionManifest();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const result2 = await getVersionManifest();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(getVersionManifest()).rejects.toThrow(
        'Failed to load version manifest'
      );
    });

    it('should throw error when manifest structure is invalid', async () => {
      const invalidManifest = {
        generated_at: '2024-01-15T10:30:00.000Z',
        current: {},
        previous: null,
        available_versions: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(invalidManifest)
      });

      await expect(getVersionManifest()).rejects.toThrow(
        'Failed to load version manifest'
      );
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getVersionManifest()).rejects.toThrow(
        'Failed to load version manifest'
      );
    });
  });

  describe('getCurrentVersion', () => {
    it('should return current version from manifest', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(MOCK_VERSION_MANIFEST)
      });

      const version = await getCurrentVersion();
      expect(version).toBe('1.2.3');
    });
  });

  describe('getPreviousVersion', () => {
    it('should return previous version when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(MOCK_VERSION_MANIFEST)
      });

      const version = await getPreviousVersion();
      expect(version).toBe('1.2.2');
    });

    it('should return null when no previous version exists', async () => {
      const manifestWithoutPrevious = {
        ...MOCK_VERSION_MANIFEST,
        previous: null
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(manifestWithoutPrevious)
      });

      const version = await getPreviousVersion();
      expect(version).toBeNull();
    });
  });

  describe('clearVersionManifestCache', () => {
    it('should clear cache and force fresh fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(MOCK_VERSION_MANIFEST)
      });

      await getVersionManifest();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      clearVersionManifestCache();

      await getVersionManifest();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
