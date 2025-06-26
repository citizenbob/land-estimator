// addressLookup.cloudflare.ts
// Cloudflare KV address lookup experiment (sandboxed, not used in prod)

import zlib from 'zlib';

// Stub global binding for Cloudflare KV namespace
declare global {
  const ADDRESS_INDEX: {
    get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  };
}

/**
 * Fetches and parses the gzipped address index from Cloudflare KV.
 */
export async function lookupAddressByPrefix(prefix: string, limit = 5) {
  // Retrieve gzipped data from KV
  const raw = await ADDRESS_INDEX.get('address-index.json.gz', 'arrayBuffer');
  if (!raw) throw new Error('Index not found in KV');

  const buf = Buffer.from(raw as ArrayBuffer);
  const jsonText = zlib.gunzipSync(buf).toString('utf-8');
  const entries = JSON.parse(jsonText) as Array<{ searchable: string }>;
  return entries.filter((e) => e.searchable.startsWith(prefix)).slice(0, limit);
}
