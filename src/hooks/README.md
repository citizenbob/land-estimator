# Address Input Hooks Architecture

This document explains how the different hooks for the AddressInput component work together.

## Overview

The AddressInput component uses a combination of hooks to manage its state and behavior:

1. `useAddressLookup` - Core data fetching and state management
2. `useInputState` - Derived UI states based on the core state
3. `useSuggestionNavigation` - Keyboard navigation and accessibility
4. `useEventLogger` - Analytics and event logging

## Data Flow

```
┌───────────────────────┐     ┌─────────────────────┐
│                       │     │                     │
│  NominatimApiClient   │◄────┤  useAddressLookup   │
│                       │     │                     │
└───────────────────────┘     └────────────┬────────┘
                                           │
                                           │
                                           ▼
┌────────────────────┐            ┌────────────────────┐
│                    │    BI Data │                    │
│  useEventLogger    │◄───────────┤    AddressInput    │
│                    │            │    Component       │
└────────────────────┘            │                    │
                                  └───┬────────────┬───┘
                                      │            │
                          UI States   │            │ Keyboard Events
                                      │            │
                        ┌─────────────▼──┐     ┌──-▼─────────────────────┐
                        │                │     │                         │
                        │  useInputState │     │ useSuggestionNavigation │
                        │                │     │                         │
                        └────────────────┘     └─────────────────────────┘
```

## Hook Responsibilities

### useAddressLookup

- Makes API calls to fetch address suggestions using NominatimApiClient
- Manages the core state (query, suggestions, loading, error)
- Handles debouncing of API requests
- Stores raw API response data for later access

```typescript
// Key states
const [query, setQuery] = useState<string>('');
const [suggestions, setSuggestions] = useState<...>([]);
const [isFetching, setIsFetching] = useState<boolean>(false);
const [hasFetched, setHasFetched] = useState<boolean>(false);
const [locked, setLocked] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
```

### useInputState

- Takes the core state from useAddressLookup and derives UI states
- Determines which UI elements should be shown (loading spinner, error messages, suggestions list)
- Processes and deduplicates suggestions for display
- Controls the estimate button visibility

```typescript
// Derived states
const showLoading = isFetching;
const showErrorAlert = !isFetching && hasFetched && !locked && /*...*/;
const showSuggestions = (query?.trim() ?? '') !== '' && /*...*/;
const showClearButton = locked;
const showEstimateButton = locked;
```

### useSuggestionNavigation

- Manages keyboard navigation between address suggestions
- Implements arrow key behavior for navigating the suggestions list
- Handles Enter key selection and Escape key cancellation
- Maintains focus states and a11y

### useEventLogger

- Logs user interactions with the address input
- Sends analytics data to Mixpanel and Firestore
- Wraps the logging service to provide a consistent interface

## Testing Strategy

Each hook is tested independently:

- `useAddressLookup.test.ts` - Tests API interactions and state management
- `useInputState.test.ts` - Tests UI state derivation logic
- `useSuggestionNavigation.test.ts` - Tests keyboard navigation behavior
- `useEventLogger.test.ts` - Tests event logging functionality

The AddressInput component has integration tests that verify these hooks work together properly.
