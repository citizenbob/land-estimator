// addressLookup.firestore.test.ts
// TDD: Failing test first

import { lookupAddressByPrefix } from './addressLookup.firestore';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import zlib from 'zlib';

// Prepare a small sample dataset
const sampleAddresses = [
  { searchable: '123 Main St', otherField: 'foo' },
  { searchable: '456 Elm St', otherField: 'bar' }
];
const gzippedSample = zlib.gzipSync(
  Buffer.from(JSON.stringify(sampleAddresses))
);

beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    async () =>
      ({
        ok: true,
        arrayBuffer: async () => gzippedSample.buffer
      }) as Response
  );
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Firestore Address Lookup Experiment', () => {
  it('returns address results for a known prefix', async () => {
    const results = await lookupAddressByPrefix('123 Main');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('searchable', '123 Main St');
  });

  it('returns quickly (latency < 100ms)', async () => {
    const start = Date.now();
    await lookupAddressByPrefix('123 Main');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
