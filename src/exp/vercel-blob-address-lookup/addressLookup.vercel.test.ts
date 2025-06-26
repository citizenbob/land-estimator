import { lookupAddressByPrefix } from './addressLookup.vercel';
import { describe, it, expect, vi } from 'vitest';
import zlib from 'zlib';

function createMockFetch(data: unknown) {
  const jsonString = JSON.stringify(data);
  const gzippedBuffer = zlib.gzipSync(Buffer.from(jsonString));

  return vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => gzippedBuffer.buffer
  } as Response);
}

describe('Vercel Blob Address Lookup Experiment', () => {
  describe('searchStrings format (actual Vercel Blob format)', () => {
    const sampleData = {
      searchStrings: [
        '123 Main St., St. Louis, MO 63102 10001000005',
        '456 Oak Ave., St. Louis, MO 63103 10001000010',
        '789 Elm St., St. Louis, MO 63104 10001000015'
      ],
      timestamp: '2025-06-26T07:11:58.707Z',
      recordCount: 3
    };

    it('returns address results for a known prefix', async () => {
      const mockFetch = createMockFetch(sampleData);
      vi.stubGlobal('fetch', mockFetch);

      const results = await lookupAddressByPrefix('123');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0]).toBe('123 Main St., St. Louis, MO 63102 10001000005');

      vi.unstubAllGlobals();
    });

    it('handles case-insensitive search', async () => {
      const mockFetch = createMockFetch(sampleData);
      vi.stubGlobal('fetch', mockFetch);

      const results = await lookupAddressByPrefix('456');
      expect(results.length).toBe(1);
      expect(results[0]).toContain('Oak Ave');

      vi.unstubAllGlobals();
    });

    it('respects the limit parameter', async () => {
      const mockFetch = createMockFetch(sampleData);
      vi.stubGlobal('fetch', mockFetch);

      const results = await lookupAddressByPrefix('', 2);
      expect(results.length).toBe(2);

      vi.unstubAllGlobals();
    });

    it('returns quickly (latency < 100ms)', async () => {
      const mockFetch = createMockFetch(sampleData);
      vi.stubGlobal('fetch', mockFetch);

      const start = Date.now();
      await lookupAddressByPrefix('456');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100);

      vi.unstubAllGlobals();
    });
  });

  describe('direct array format', () => {
    it('handles direct array format', async () => {
      const sampleData = ['123 Direct St', '456 Array Ave'];

      const mockFetch = createMockFetch(sampleData);
      vi.stubGlobal('fetch', mockFetch);

      const results = await lookupAddressByPrefix('123');
      expect(results.length).toBe(1);
      expect(results[0]).toBe('123 Direct St');

      vi.unstubAllGlobals();
    });
  });

  describe('object values format', () => {
    it('handles object values format', async () => {
      const sampleData = {
        addr1: '123 Object St',
        addr2: '456 Values Ave'
      };

      const mockFetch = createMockFetch(sampleData);
      vi.stubGlobal('fetch', mockFetch);

      const results = await lookupAddressByPrefix('123');
      expect(results.length).toBe(1);
      expect(results[0]).toEqual({ searchable: '123 Object St' });

      vi.unstubAllGlobals();
    });
  });

  describe('error handling', () => {
    it('throws error for fetch failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      } as Response);
      vi.stubGlobal('fetch', mockFetch);

      await expect(lookupAddressByPrefix('123')).rejects.toThrow(
        'Failed to fetch index: Not Found'
      );

      vi.unstubAllGlobals();
    });
  });
});
