# Firestore Address Lookup Experiment

**Goal:**  
Evaluate Firestore as a runtime data source for address typeahead, measuring latency and feasibility for production.

## Setup

- File stored in Firebase Storage at: `gs://land-estimator-29ee9.firebasestorage.app/cdn/address-index.json.gz`
- Public CDN URL (with access token):
  `https://firebasestorage.googleapis.com/v0/b/land-estimator-29ee9.firebasestorage.app/o/cdn%2Faddress-index.json.gz?alt=media&token=744d3a34-24d7-4203-a08b-142f27620e58`
- No additional seeding needed; the experiment fetches directly from storage.

1. Install dependencies if needed: `npm install firebase-admin zlib`
2. Run tests:
   `npm run test src/exp/firestore-address-lookup/addressLookup.firestore.test.ts`
3. (Optional) Deploy the endpoint for E2E latency testing.

## Test Results

| Test Name               | Status | Notes |
| ----------------------- | ------ | ----- |
| Returns address results | [ ]    |       |
| Latency < 100ms         | [ ]    |       |

## How to Run

- Run the test file directly.
- Import the endpoint in a local Next.js API route for manual testing.

## Rollback

- Delete this folder and remove any related test routes.
