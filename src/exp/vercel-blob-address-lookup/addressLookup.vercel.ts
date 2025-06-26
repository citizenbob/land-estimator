// addressLookup.vercel.ts
// Vercel Blob address lookup experiment endpoint (sandboxed, not used in prod)
// Robust implementation to handle multiple JSON formats from Vercel Blob storage

import zlib from 'zlib';

// Public Vercel Blob URL for address index
const BLOB_URL =
  'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/address-index.json.gz';

/**
 * Robust address lookup that handles multiple JSON formats:
 * 1. { addresses: [...] } - wrapped in addresses property
 * 2. [...] - direct array
 * 3. { searchStrings: [...] } - wrapped in searchStrings property
 * 4. Object with string values - convert values to array
 */
export async function lookupAddressByPrefix(prefix: string, limit = 5) {
  const res = await fetch(BLOB_URL);
  if (!res.ok) throw new Error(`Failed to fetch index: ${res.statusText}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const jsonText = zlib.gunzipSync(buffer).toString('utf-8');
  const parsed = JSON.parse(jsonText);

  // Strategy 1: Check for { addresses: [...] }
  if (parsed && parsed.addresses && Array.isArray(parsed.addresses)) {
    return filterAndLimit(parsed.addresses, prefix, limit);
  }

  // Strategy 2: Check for { searchStrings: [...] }
  if (parsed && parsed.searchStrings && Array.isArray(parsed.searchStrings)) {
    return filterAndLimit(parsed.searchStrings, prefix, limit);
  }

  // Strategy 3: Direct array
  if (Array.isArray(parsed)) {
    return filterAndLimit(parsed, prefix, limit);
  }

  // Strategy 4: Object with string values (convert to searchable format)
  if (parsed && typeof parsed === 'object') {
    const values = Object.values(parsed);
    const searchableEntries = values.map((val) =>
      typeof val === 'string'
        ? { searchable: val }
        : val && typeof val === 'object' && 'searchable' in val
          ? val
          : { searchable: String(val) }
    );
    return filterAndLimit(searchableEntries, prefix, limit);
  }

  throw new Error(
    `Unexpected index JSON format. Type: ${typeof parsed}, Keys: ${parsed && typeof parsed === 'object' ? Object.keys(parsed).slice(0, 10).join(', ') : 'N/A'}`
  );
}

/**
 * Filter entries by prefix and limit results
 */
function filterAndLimit(entries: unknown[], prefix: string, limit: number) {
  const results = entries
    .filter((entry) => {
      // Handle string entries
      if (typeof entry === 'string') {
        return entry.toLowerCase().startsWith(prefix.toLowerCase());
      }
      // Handle object entries with searchable property
      if (entry && typeof entry === 'object' && 'searchable' in entry) {
        const searchable = (entry as { searchable: unknown }).searchable;
        if (typeof searchable === 'string') {
          return searchable.toLowerCase().startsWith(prefix.toLowerCase());
        }
      }
      return false;
    })
    .slice(0, limit);

  return results;
}
