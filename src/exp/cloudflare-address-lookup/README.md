# Cloudflare KV Address Lookup Experiment

**Goal:**
Use Cloudflare KV to serve a compressed address index at edge for typeahead.

## Setup

1. Create a KV namespace in Cloudflare named `ADDRESS_INDEX` and note the namespace ID.
2. In your project root, add or update `wrangler.toml` with:

   ```toml
   name = "land-estimator-kv-experiment"
   main = "src/exp/cloudflare-address-lookup/worker.ts"
   type = "javascript"

   [[kv_namespaces]]
   binding = "ADDRESS_INDEX"
   id = "<your-namespace-id>"
   ```

3. Ensure you have the compressed index in your repo at `public/address-index.json.gz` (or adjust the path below).
4. Seed the KV namespace with that file under the same key name:
   ```bash
   npx wrangler kv:key put ADDRESS_INDEX address-index.json.gz public/address-index.json.gz
   ```
5. (Optional) Verify locally with Wrangler:
   ```bash
   npx wrangler dev src/exp/cloudflare-address-lookup/worker.ts
   # then curl http://localhost:8787?q=123%20Main&limit=5
   ```
6. Run unit tests (stubbed, no real KV required):
   ```bash
   npm run test src/exp/cloudflare-address-lookup/addressLookup.cloudflare.test.ts
   ```

## Success Criteria

- Tests pass for result correctness and latency (<100 ms).

## Rollback

- Remove `src/exp/cloudflare-address-lookup/` folder.
- Remove KV namespace binding from `wrangler.toml` and delete the namespace in Cloudflare dashboard.
