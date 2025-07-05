# Services

This directory contains core service modules for data loading, search, logging, and estimation used throughout the application. Each module exports functions and types intended for specific tasks.

---

## loadAddressIndex.ts

**Exports**

- `loadAddressIndex(): Promise<FlexSearch.FlexSearchIndexBundle>`
- `clearAddressIndexCache(): void`
- `importNodeModules(): Promise<{ fs; path }>`
- `_setTestMockNodeModules(mock): void` (testing only)

Loads a precomputed address search index for address lookup, compatible with both browser and Node.js environments. Caches the loaded bundle for performance.

**Usage**

```ts
import {
  loadAddressIndex,
  clearAddressIndexCache
} from '../services/loadAddressIndex';

async function initSearch() {
  // Load or reuse the cached index bundle
  const bundle = await loadAddressIndex();
  const { index, parcelIds, addressData } = bundle;
  // Use index.search(), parcelIds, and addressData as needed
}

// Clear cache if you need to force reload (e.g., in tests)
clearIndexCache();
```

---

## addressSearch.ts

**Exports**

- `AddressLookupRecord` (interface)
- `searchAddresses(query: string, limit?: number): Promise<AddressLookupRecord[]>`

Performs normalized address search using the FlexSearch index. Automatically loads the index on first call, formats results, and handles errors gracefully.

**Usage**

```ts
import { searchAddresses } from '../services/addressSearch';

async function fetchAddresses() {
  const results = await searchAddresses('100 Main St', 5);
  results.forEach((record) => {
    console.log(record.id, record.display_name, record.region);
  });
}
```

---

## parcelMetadata.ts

**Exports**

- `getParcelMetadata(parcelId: string): Promise<ParcelMetadata | null>`
- `getBulkParcelMetadata(parcelIds: string[]): Promise<ParcelMetadata[]>`
- `createBoundingBoxFromParcel(parcel: ParcelMetadata): [string, string, string, string]`

Loads and caches parcel metadata from a static JSON file. Provides lookup by ID and helper to compute a simple geographic bounding box for a parcel.

**Usage**

```ts
import {
  getParcelMetadata,
  getBulkParcelMetadata,
  createBoundingBoxFromParcel
} from '../services/parcelMetadata';

async function example() {
  const parcel = await getParcelMetadata('12345');
  if (parcel) {
    const box = createBoundingBoxFromParcel(parcel);
    console.log('Bounding box:', box);
  }

  const many = await getBulkParcelMetadata(['12345', '67890']);
  console.log('Loaded parcels:', many.length);
}
```

---

## landscapeEstimator.ts

**Exports**

- `estimateLandscapingPrice(boundingBox, options?): PriceBreakdown`
- `estimateLandscapingPriceFromParcel(parcelData, options?): PriceBreakdown`
- `calculateAffluenceMultiplier(affluenceScore: number): number`

Provides functions to calculate detailed landscaping cost estimates. Supports design, installation, and maintenance services, with configurable residential/commercial options and affluence-based adjustments.

**Default Configuration Values**

- Residential Base Rate per sq ft: min = 4.5, max = 12
- Commercial Multiplier: 0.85
- Design Fee Percentage of Installation: 0.2 (20%)
- Maintenance Monthly Rate (Residential): min = 100, max = 400
- Minimum Service Fee: 400
- Affluence Multiplier Parameters:
  - minMultiplier = 0.85
  - maxMultiplier = 1.25
  - baselineScore = 50

**How It Works with Formulas**

1. **Area Calculation** (`calculateAreaFromBoundingBox`):
   - avgLat = ((latMin + latMax) / 2) × (π / 180)
   - latDiff = |latMax − latMin| × (π / 180)
   - lonDiff = |lonMax − lonMin| × (π / 180)
   - widthFt = R × lonDiff × cos(avgLat)
   - heightFt = R × latDiff
   - areaSqFt = |widthFt × heightFt|
     where R ≈ 20,925,524.9 ft (Earth radius)
2. **Affluence Multiplier** (`calculateAffluenceMultiplier`):
   - Let m_min = 0.85, m_max = 1.25, baseline = 50
   - If score ≤ baseline:
     m = m_min + (1 − m_min) × (score / baseline)
   - Else:
     m = 1 + (m_max − 1) × ((score − baseline) / (100 − baseline))
3. **Combined Multiplier**:
   m_combined = (isCommercial ? commercialMultiplier : 1) × m
4. **Base Rates**:
   base_min = residential.baseRate.min × m_combined
   base_max = residential.baseRate.max × m_combined
5. **Service Costs**:
   - **Installation**:
     install_min = areaSqFt × base_min
     install_max = areaSqFt × base_max
   - **Design**:
     raw_min = install_min × designPercentOfInstall
     raw_max = install_max × designPercentOfInstall
     fee_min = max(raw_min, minimumServiceFee)
     fee_max = max(raw_max, minimumServiceFee)
     designFee = (fee_min + fee_max) / 2
   - **Maintenance**:
     maintenance_min = residential.maintenanceMonthly.min × m_combined
     maintenance_max = residential.maintenanceMonthly.max × m_combined
6. **Subtotal & Minimum Fee**:
   subtotal_min = install_min + fee_min + maintenance_min
   subtotal_max = install_max + fee_max + maintenance_max
   final_min = max(subtotal_min, minimumServiceFee)
   final_max = max(subtotal_max, minimumServiceFee)
7. **Final PriceBreakdown**:
   Returns all component values and `{ min: final_min, max: final_max }` as `finalEstimate`.
   Averages for display can be computed as `(min + max) / 2`.

**Usage**

```ts
import {
  estimateLandscapingPrice,
  estimateLandscapingPriceFromParcel
} from '../services/landscapeEstimator';

// Using geographic bounding box
const estimate1 = estimateLandscapingPrice(
  ['38.6', '38.61', '-90.2', '-90.19'],
  {
    serviceTypes: ['design', 'installation', 'maintenance'],
    isCommercial: false,
    affluenceScore: 70
  }
);
console.log('Estimate by box:', estimate1);

// Using parcel data directly
import { getParcelMetadata } from '../services/parcelMetadata';
const parcel = await getParcelMetadata('12345');
if (parcel) {
  const estimate2 = estimateLandscapingPriceFromParcel(parcel, {
    isCommercial: true
  });
  console.log('Estimate by parcel:', estimate2);
}
```

---

## logger.ts (Event Logging)

**Exports**

- `logEvent<T extends keyof EventMap>(eventName: T, data: EventMap[T], options?): Promise<void>`

Logs events to Mixpanel and via a Firestore API endpoint. Automatically enriches event data with a timestamp and handles errors internally.

**Usage**

```ts
import { logEvent } from '../services/logger';

await logEvent(
  'page_view',
  { page: 'Home', timestamp: Date.now() },
  { toMixpanel: true, toFirestore: true }
);
```

---

## ../lib/logger.ts (Environment-Aware Logging)

**Exports**

- `devLog(...args: unknown[]): void`
- `devWarn(...args: unknown[]): void`
- `logError(...args: unknown[]): void`
- `prodLog(...args: unknown[]): void`

Environment-aware logging utility that respects deployment boundaries. Development and debugging logs are automatically suppressed in production unless explicitly enabled.

**Logging Levels**

- **devLog/devWarn**: Only logs in development, test, or when `ENABLE_LOGGING=true`
- **logError**: Always logs errors regardless of environment
- **prodLog**: Always logs important production messages

**Usage**

```ts
import { devLog, devWarn, logError, prodLog } from '@lib/logger';

// Development-only verbose logging
devLog('🚀 Starting data load process...');
devWarn('⚠️ Fallback mechanism activated');

// Always logged
logError('❌ Critical error occurred:', error);
prodLog('✅ Application started successfully');
```

**Environment Variables**

- `NODE_ENV=development`: Enables devLog/devWarn output
- `NODE_ENV=test`: Enables devLog/devWarn output
- `ENABLE_LOGGING=true`: Force-enables devLog/devWarn in any environment

---

### Contributing

For any changes to services, please ensure:

- All new exports are documented here.
- Unit tests cover expected behaviors and edge cases.
- JSDoc comments are included for complex logic.
