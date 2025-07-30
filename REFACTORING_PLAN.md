# Refactoring Plan: DRY and Clarity Improvements

This document outlines identified opportunities to refactor the codebase for better clarity and DRY (Don't Repeat Yourself) practices, without adding comments.

## 1. Test Setup/Teardown Duplication

### Problem

Almost every test file has repetitive beforeEach/afterEach patterns:

```typescript
// Pattern repeated across multiple test files
beforeEach(() => {
  consoleMocks = setupConsoleMocks();
  setupTestTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  consoleMocks.restore();
  cleanupTestTimers();
  vi.clearAllMocks();
});
```

### Solution

Create a standardized test suite setup utility:

```typescript
// src/lib/testSuiteHelpers.ts
export function createTestSuite(
  options: {
    consoleMocks?: boolean;
    timers?: boolean;
    fetch?: boolean;
  } = {}
) {
  let context: Record<string, unknown> = {};

  const beforeEachSetup = () => {
    if (options.consoleMocks) {
      context.consoleMocks = setupConsoleMocks();
    }
    if (options.timers) {
      setupTestTimers();
      context.timersSetup = true;
    }
    if (options.fetch) {
      context.mockFetch = createMockFetch();
    }
    vi.clearAllMocks();
  };

  const afterEachCleanup = () => {
    if (context.consoleMocks) {
      (context.consoleMocks as any).restore();
    }
    if (context.timersSetup) {
      cleanupTestTimers();
    }
    vi.clearAllMocks();
  };

  return { beforeEachSetup, afterEachCleanup, getContext: () => context };
}
```

### Steps

1. ✅ ~~Create `src/lib/testSuiteHelpers.ts`~~ Consolidated into `testUtils.ts`
2. ✅ ~~Implement the `createTestSuite` function in `testUtils.ts`~~
3. ✅ ~~Update all test files to use the new utility (20+ files completed)~~
4. ✅ ~~Remove repetitive beforeEach/afterEach code (20+ files completed)~~

**Note**: The test suite helpers have been consolidated into the existing `testUtils.ts` file to reduce the number of utility files and maintain better organization.

**Updated Files**: Successfully refactored 20+ test files including:

- `src/services/biLogging.test.ts`
- `src/app/api/log/route.test.ts`
- `src/components/Alert/Alert.test.tsx`
- `src/services/addressSearch.test.ts`
- `src/hooks/useSuggestionNavigation.test.ts`
- `src/services/parcelMetadata.test.ts`
- `src/app/api/parcel-metadata/[id]/route.test.ts`
- `src/hooks/useLandscapeEstimator.test.ts`
- `src/services/logger.test.ts` ⭐ (complex file)
- `src/hooks/useEventLogger.test.ts`
- `src/hooks/useAddressLookup.test.ts`
- `src/components/AddressInput/AddressInput.test.tsx` ⭐ (complex component)
- `src/workers/serviceWorkerClient.test.ts` ⭐ (most complex file - 20+ tests, nested describes)
- And 7+ additional test files

**Impact**: Eliminated 20+ lines of repetitive setup/teardown code per test file, standardized test patterns across the entire test codebase, and improved maintainability. The refactoring successfully handled files ranging from simple unit tests to complex integration tests with nested describe blocks and intricate mock management.

**Completion Status**: ✅ **FULLY COMPLETE** - All test files in the workspace have been successfully refactored to use the centralized `createTestSuite` pattern. No remaining test files require the old beforeEach/afterEach patterns.

## 2. FlexSearch Configuration Duplication

### Problem

FlexSearch configuration is duplicated across multiple files:

```typescript
// Repeated in multiple places
const FLEXSEARCH_CONFIG = {
  tokenize: 'forward',
  threshold: 1,
  resolution: 9,
  depth: 4
};
```

### Solution

Centralize configuration:

```typescript
// src/config/flexsearch.ts
export const FLEXSEARCH_CONFIG = {
  tokenize: 'forward' as const,
  threshold: 1,
  resolution: 9,
  depth: 4
};

export const FLEXSEARCH_SEARCH_OPTIONS = {
  bool: 'and' as const,
  limit: 10
};
```

### Steps

1. Create `src/config/flexsearch.ts`
2. Define centralized FlexSearch configurations
3. Update all files using FlexSearch to import from the config
4. Remove duplicated configuration objects

## 3. Mock Response Factory Duplication

### Problem

Multiple variations of mock response creation:

```typescript
// Pattern repeated in different forms
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: () => Promise.resolve(data)
});
```

### Solution

Create a standardized factory:

```typescript
// src/lib/mockFactories.ts
export const createMockResponse = (
  data: unknown,
  options: { ok?: boolean; status?: number } = {}
) => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data))
});

export const createMockFetchSequence = (
  responses: Array<{
    data: unknown;
    ok?: boolean;
    status?: number;
  }>
) => {
  const mockFetch = vi.fn();
  responses.forEach((response) => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse(response.data, response)
    );
  });
  return mockFetch;
};
```

### Steps

1. Create `src/lib/mockFactories.ts`
2. Implement standardized mock response factories
3. Update all test files to use the new factories
4. Remove repetitive mock response creation code

## 4. Address Data Processing Duplication

### Problem

Similar address data transformations scattered across files:

```typescript
// Similar patterns in multiple places
const simplified = results.map((item) => ({
  place_id: item.id,
  display_name: item.display_name
}));
```

### Solution

Create transformation utilities:

```typescript
// src/lib/addressTransforms.ts
export const simplifyAddressRecord = (item: AddressLookupRecord) => ({
  place_id: item.id,
  display_name: item.display_name
});

export const enrichAddressData = (
  item: AddressLookupRecord,
  metadata?: ParcelMetadata
) => ({
  ...item,
  region: extractRegion(item.display_name),
  normalized: normalizeQuery(item.display_name),
  ...metadata
});

export const extractRegion = (displayName: string): string => {
  const regionMatch = displayName.match(/, ([^,]+), MO/);
  return regionMatch ? regionMatch[1] : 'Missouri';
};

export const normalizeQuery = (query: string): string =>
  query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
```

### Steps

1. Create `src/lib/addressTransforms.ts`
2. Implement address transformation utilities
3. Update all files using address transformations to use the new utilities
4. Remove duplicated transformation logic

## 5. Error Handling Pattern Duplication

### Problem

Repetitive error handling patterns in services:

```typescript
// Pattern repeated across service files
try {
  // operation
} catch (error: unknown) {
  logError(error, { operation: 'operation_name' });
  throw error;
}
```

### Solution

Create error handling decorators:

```typescript
// src/lib/errorHandling.ts
export const withErrorLogging = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      logError(error, { operation });
      throw error;
    }
  };
};

export const withRetry = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  maxRetries = 3,
  delay = 1000
) => {
  return async (...args: T): Promise<R> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  };
};
```

### Steps

1. Create `src/lib/errorHandling.ts`
2. Implement error handling decorators
3. Update service functions to use the decorators
4. Remove repetitive try-catch blocks

## 6. Bundle Loading Pattern Duplication

### Problem

Similar bundle loading logic across different index types:

```typescript
// Similar patterns for address index, parcel metadata, etc.
if (!cached) {
  const data = await fetchData();
  cached = processData(data);
}
return cached;
```

### Solution

Create a generic bundle loader:

```typescript
// src/lib/bundleLoader.ts
export class BundleLoader<T> {
  private cache: T | null = null;

  constructor(
    private fetcher: () => Promise<unknown>,
    private processor: (data: unknown) => T,
    private cacheKey: string
  ) {}

  async load(): Promise<T> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const rawData = await this.fetcher();
      this.cache = this.processor(rawData);
      return this.cache;
    } catch (error) {
      logError(error, { operation: `load_${this.cacheKey}` });
      throw error;
    }
  }

  clear(): void {
    this.cache = null;
  }
}

// Usage:
const addressIndexLoader = new BundleLoader(
  () => fetch('/search/latest.json').then((r) => r.json()),
  (data) => createFlexSearchBundle(data),
  'address_index'
);
```

### Steps

1. Create `src/lib/bundleLoader.ts`
2. Implement the generic BundleLoader class
3. Update all bundle loading services to use the new class
4. Remove duplicated loading logic

## 7. Component Test Pattern Duplication

### Problem

Similar component test setups across multiple files:

```typescript
// Repeated patterns in component tests
const mockProps = {
  onSubmit: vi.fn(),
  disabled: false,
  // ... other props
};

const { rerender } = render(<Component {...mockProps} />);
```

### Solution

Create component test utilities:

```typescript
// src/lib/componentTestUtils.ts
export const createComponentTester = <P extends object>(
  Component: React.ComponentType<P>,
  defaultProps: P
) => {
  return {
    render: (overrides: Partial<P> = {}) => {
      const props = { ...defaultProps, ...overrides };
      return render(<Component {...props} />);
    },

    renderAndRerender: (initialProps: Partial<P> = {}, newProps: Partial<P> = {}) => {
      const initial = { ...defaultProps, ...initialProps };
      const updated = { ...defaultProps, ...newProps };
      const { rerender } = render(<Component {...initial} />);
      rerender(<Component {...updated} />);
      return { rerender };
    }
  };
};

// Usage:
const addressInputTester = createComponentTester(AddressInput, {
  onSubmit: vi.fn(),
  disabled: false,
  placeholder: 'Enter address'
});
```

### Steps

1. Create `src/lib/componentTestUtils.ts`
2. Implement component testing utilities
3. Update component test files to use the new utilities
4. Remove repetitive component test setup code

## 8. Manifest Processing Duplication

### Problem

Similar manifest processing logic in multiple places:

```typescript
// Similar patterns for processing manifest data
const regions = manifest.regions.map((region) => ({
  name: region.region,
  file: region.document_file
}));
```

### Solution

Create manifest utilities:

```typescript
// src/lib/manifestUtils.ts
export const processManifest = (manifest: ShardManifest) => ({
  regions: manifest.regions.map((region) => ({
    name: region.region,
    version: region.version,
    documentFile: region.document_file,
    lookupFile: region.lookup_file
  })),
  metadata: {
    generatedAt: new Date(manifest.metadata.generated_at),
    version: manifest.metadata.version,
    totalRegions: manifest.metadata.total_regions,
    source: manifest.metadata.source
  }
});

export const findRegionByName = (manifest: ShardManifest, regionName: string) =>
  manifest.regions.find((region) => region.region === regionName);

export const getRegionFileUrl = (
  region: ShardManifest['regions'][0],
  baseUrl = '/search'
) => `${baseUrl}/${region.document_file}`;
```

### Steps

1. Create `src/lib/manifestUtils.ts`
2. Implement manifest processing utilities
3. Update all files processing manifest data to use the new utilities
4. Remove duplicated manifest processing logic

## Implementation Priority

1. **High Priority**: Test utilities (#1, #3, #7) - Will immediately reduce test file duplication
2. **Medium Priority**: Configuration and data processing (#2, #4, #8) - Will improve consistency
3. **Low Priority**: Advanced patterns (#5, #6) - Will improve architecture but require more careful refactoring

## Benefits

These refactoring efforts will result in:

- Reduced code duplication by ~30-40%
- Improved maintainability through centralized utilities
- Better consistency across the codebase
- Easier testing with standardized patterns
- Cleaner, more focused business logic

## Notes

- All refactoring should maintain existing functionality
- TypeScript types should be preserved and improved where possible
- Existing tests should continue to pass after refactoring
- No new comments should be added during refactoring
