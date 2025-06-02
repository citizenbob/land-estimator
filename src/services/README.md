# Services Architecture

This document explains the core services used in the Land Estimator application and how they interact.

## Overview

The application uses a set of services to handle different aspects of functionality:

1. `addressSearch` - Provides address search capabilities with FlexSearch
2. `landscapeEstimator` - Calculates price estimates for landscaping services
3. `logger` - Centralized logging service for analytics
4. `nominatimApi` - Client for geocoding and address lookups
5. `parcelSearch` - Additional parcel data search capabilities

## Analytics Integration

The application uses a comprehensive analytics system to track user behavior and system performance. This helps us to:

1. Understand user search patterns and preferences
2. Monitor system performance and identify bottlenecks
3. Detect and diagnose errors
4. Track lead generation and conversion

### Logger Service

The `logger.ts` service provides centralized logging functionality:

```typescript
// Key function
logEvent(eventName: string, data: Record<string, any>, options?: LogOptions): void
```

- Sends events to Mixpanel for product analytics
- Records events in Firestore for business intelligence
- Handles error cases gracefully to avoid disrupting user experience

### Logged Events

#### Address Search Events

| Event Name         | Description                                    | Data Points                                             |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------- |
| `cache_hit`        | Shard was already loaded and served from cache | `{ shard: string }`                                     |
| `shard_loaded`     | New shard successfully loaded                  | `{ shard: string, recordCount: number }`                |
| `shard_load_error` | Error occurred during shard loading            | `{ shard: string, error: string }`                      |
| `search_performed` | Search query executed                          | `{ shard: string, query: string, resultCount: number }` |
| `search_error`     | Error during search                            | `{ shard: string, query: string, error: string }`       |

#### UI Interaction Events

| Event Name                | Description                               | Data Points                             |
| ------------------------- | ----------------------------------------- | --------------------------------------- |
| `address_selected`        | User selected an address from suggestions | `{ query: string, address_id: string }` |
| `estimate_button_clicked` | User clicked the estimate button          | `{ address_id: string }`                |
| `service_type_selected`   | User selected a service type              | `{ service_type: string }`              |

## Implementation Details

### Address Search Service

The `addressSearch.ts` service uses FlexSearch to provide fast, client-side address searching:

- Uses a shard-based approach to manage memory usage
- Implements caching to improve performance on repeated searches
- Logs analytics events at key points in the search process

```typescript
// Example workflow with analytics
try {
  // Check cache first
  if (cached) {
    logEvent('cache_hit', { shard: key });
    // Return cached data
  }

  // Load shard data
  const data = await loadShardData();

  // Log successful load
  logEvent('shard_loaded', { shard: key, recordCount: data.length });

  // Return data
} catch (error) {
  // Log error
  logEvent('shard_load_error', { shard: key, error: errorMessage });
  throw new Error('Failed to load shard');
}
```

### Testing Strategy

Services have comprehensive test coverage that includes:

- Unit tests for core functionality
- Tests that verify logging calls are made correctly
- Error case handling tests
- Mock implementations of external dependencies

For analytics-specific testing, we:

- Mock the `logEvent` function to verify it's called with correct parameters
- Test both success and error paths to ensure proper logging
- Validate that logging errors don't disrupt the main application flow

## Privacy Considerations

Our analytics implementation follows these privacy principles:

1. No personally identifiable information (PII) is logged without explicit consent
2. Address data is anonymized where possible
3. Analytics are used to improve the product, not for targeted advertising
4. Users can opt-out of analytics through account settings

## Adding New Analytics Events

When adding new events, follow these guidelines:

1. Use descriptive, consistent event names (`noun_verb` format)
2. Include contextual data that will be useful for analysis
3. Document the new event in this README
4. Add appropriate tests to verify logging behavior
5. Consider privacy implications of any new data points
