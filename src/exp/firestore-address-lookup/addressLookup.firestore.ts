// addressLookup.firestore.ts
// Firestore address lookup experiment endpoint (sandboxed, not used in prod)

import zlib from 'zlib';

// Public CDN URL for address-index.json.gz
const CDN_URL =
  'https://firebasestorage.googleapis.com/v0/b/land-estimator-29ee9.firebasestorage.app/o/cdn%2Faddress-index.json.gz?alt=media&token=744d3a34-24d7-4203-a08b-142f27620e58';

/**
 * Looks up addresses by prefix using the gzipped JSON index fetched from CDN.
 * @param prefix The address prefix to search for.
 * @param limit Max results to return.
 */
export async function lookupAddressByPrefix(prefix: string, limit = 5) {
  const res = await fetch(CDN_URL);
  if (!res.ok) throw new Error(`Failed to fetch index: ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const jsonText = zlib.gunzipSync(buffer).toString('utf-8');
  const parsed = JSON.parse(jsonText);

  // Handle the actual structure: { addresses: [...] }
  let addressArray: Record<string, unknown>[];
  if (parsed && parsed.addresses && Array.isArray(parsed.addresses)) {
    addressArray = parsed.addresses;
  } else if (Array.isArray(parsed)) {
    addressArray = parsed;
  } else if (parsed && typeof parsed === 'object') {
    addressArray = Object.values(parsed) as Record<string, unknown>[];
  } else {
    throw new Error('Unexpected index JSON format');
  }

  return addressArray
    .filter(
      (a) => typeof a.searchable === 'string' && a.searchable.startsWith(prefix)
    )
    .slice(0, limit) as unknown[];
}
