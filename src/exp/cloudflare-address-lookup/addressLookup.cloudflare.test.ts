// addressLookup.cloudflare.test.ts
// TDD: Failing test first for Cloudflare KV experiment

import { lookupAddressByPrefix } from './addressLookup.cloudflare';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import zlib from 'zlib';

// Prepare a small sample dataset
const sampleAddresses = [
  { searchable: '123 Main St', other: 'foo' },
  { searchable: '456 Elm St', other: 'bar' }
];
const gzippedSample = zlib.gzipSync(
  Buffer.from(JSON.stringify(sampleAddresses))
);

beforeAll(() => {
  // Stub global KV namespace binding
  vi.stubGlobal('ADDRESS_INDEX', {
    get: async () => gzippedSample
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Cloudflare KV Address Lookup Experiment', () => {
  it('returns address results for a known prefix', async () => {
    const results = await lookupAddressByPrefix('123');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('searchable', '123 Main St');
  });

  it('returns quickly (latency < 100ms)', async () => {
    const start = Date.now();
    await lookupAddressByPrefix('456');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
