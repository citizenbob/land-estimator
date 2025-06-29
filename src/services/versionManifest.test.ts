import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getVersionManifest,
  getCurrentVersion,
  getPreviousVersion,
  clearVersionManifestCache,
  type VersionManifest
} from './versionManifest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockVersionManifest: VersionManifest = {
  generated_at: '2024-01-15T10:30:00.000Z',
  current: {
    version: '1.2.3',
    files: {
      address_index:
        'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/address-index-v1.2.3.json.gz',
      parcel_metadata:
        'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/parcel-metadata-v1.2.3.json.gz',
      parcel_geometry:
        'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/parcel-geometry-v1.2.3.json.gz'
    }
  },
  previous: {
    version: '1.2.2',
    files: {
      address_index:
        'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/address-index-v1.2.2.json.gz',
      parcel_metadata:
        'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/parcel-metadata-v1.2.2.json.gz',
      parcel_geometry:
        'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/parcel-geometry-v1.2.2.json.gz'
    }
  },
  available_versions: ['1.2.3', '1.2.2', '1.2.1']
};

describe('versionManifest service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearVersionManifestCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getVersionManifest', () => {
    it('should fetch and return version manifest successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockVersionManifest)
      });

      const result = await getVersionManifest();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/version-manifest.json',
        expect.objectContaining({
          cache: 'no-cache',
          headers: expect.objectContaining({
            'Cache-Control': 'no-cache, must-revalidate'
          })
        })
      );
      expect(result).toEqual(mockVersionManifest);
    });

    it('should cache manifest and reuse cached version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockVersionManifest)
      });

      // First call
      const result1 = await getVersionManifest();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache - should still only be 1 fetch call
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
        // Missing current.version and current.files
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
        json: vi.fn().mockResolvedValue(mockVersionManifest)
      });

      const version = await getCurrentVersion();
      expect(version).toBe('1.2.3');
    });
  });

  describe('getPreviousVersion', () => {
    it('should return previous version when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockVersionManifest)
      });

      const version = await getPreviousVersion();
      expect(version).toBe('1.2.2');
    });

    it('should return null when no previous version exists', async () => {
      const manifestWithoutPrevious = {
        ...mockVersionManifest,
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
        json: vi.fn().mockResolvedValue(mockVersionManifest)
      });

      // First call
      await getVersionManifest();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      clearVersionManifestCache();

      // Next call should fetch again
      await getVersionManifest();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
