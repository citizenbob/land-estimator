# Address Input Hooks Architecture

This document explains how the different hooks for the AddressInput component work together.

## Overview

The AddressInput component uses a combination of hooks to manage its state and behavior:

1. `useAddressLookup` - Core data fetching and state management
2. `useInputState` - Derived UI states based on the core state
3. `useKeyboardNavigation` - Generic keyboard navigation and accessibility
4. `useElementRefs` - Dynamic ref management for suggestion elements
5. `useAddressEventLogger` - Address-specific analytics event logging
6. `useEventLogger` - General analytics and event logging
7. `useLandscapeEstimator` - Landscape estimation calculations (separate feature)

## Data Flow

```
┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │
│   searchAddresses   │◄────┤  useAddressLookup   │
│   (FlexSearch API)  │     │                     │
└─────────────────────┘     └────────────┬────────┘
                                         │
                                         │ Core State
                                         ▼
┌─────────────────────┐            ┌────────────────────┐
│                     │    Events  │                    │
│  useEventLogger     │◄───────────┤    AddressInput    │
│                     │            │    Component       │
└─────────────────────┘            │                    │
                                   └───┬────────────┬───┘
                                       │            │
                           UI States   │            │ Navigation
                                       │            │
                         ┌─────────────▼──┐     ┌──▼─────────────────────┐
                         │                │     │                        │
                         │  useInputState │     │ useKeyboardNavigation  │
                         │                │     │                        │
                         └────────────────┘     └────────────────────────┘
                                                         │
                                                         │ Refs
                                                         ▼
                                                ┌────────────────────┐
                                                │                    │
                                                │  useElementRefs    │
                                                │                    │
                                                └────────────────────┘
```

## Hook Responsibilities

### useAddressLookup

- Makes API calls to fetch address suggestions using the searchAddresses service
- Manages the core state (query, suggestions, loading, error)
- Handles debouncing of API requests (150ms)
- Stores raw API response data for later parcel metadata enrichment
- Provides suggestion selection and clearing functionality

```typescript
// Key states and methods
const [query, setQuery] = useState<string>('');
const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
const [isFetching, setIsFetching] = useState<boolean>(false);
const [hasFetched, setHasFetched] = useState<boolean>(false);
const [locked, setLocked] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);

// Methods: handleChange, handleSelect, handleClear, getSuggestionData
```

### useInputState

- Takes the core state from useAddressLookup and derives UI states
- Determines which UI elements should be shown (loading spinner, error messages, suggestions list)
- Processes and deduplicates suggestions for display
- Controls the estimate button and clear button visibility
- Enriches suggestions with default values for missing properties

```typescript
// Derived states
const showLoading = isFetching;
const showErrorAlert =
  !isFetching &&
  hasFetched &&
  !locked &&
  query.trim() !== '' &&
  suggestions.length === 0;
const showSuggestions =
  query?.trim() !== '' && uniqueSuggestions.length > 0 && !locked;
const showClearButton = locked;
const showEstimateButton = locked;
const uniqueSuggestions = deduplicatedByDisplayName(suggestions);
```

### useKeyboardNavigation

- Generic keyboard navigation hook for interactive element lists
- Implements arrow key behavior for navigating between elements
- Handles Enter key selection and focus management
- Works with any list of elements, not just address suggestions
- Provides handleTriggerKeyDown and handleElementKeyDown methods

### useElementRefs

- Dynamically manages an array of React refs for list elements
- Creates the correct number of refs based on the list length
- Maintains ref stability when the count doesn't change
- Returns both the refs array and a getter function for accessing current elements

### useAddressEventLogger

- Address-specific wrapper around the general event logger
- Handles formatting of address selection and estimate button events
- Calculates position in results for analytics
- Provides logAddressEvent method for consistent event structure

### useEventLogger

- General-purpose analytics and event logging hook
- Sends events to Mixpanel and Firestore via the logger service
- Provides consistent error handling for logging failures
- Supports configurable logging options (toMixpanel, toFirestore)

### useLandscapeEstimator

- Separate feature hook for landscape estimation calculations
- Manages estimate results, loading states, and calculation parameters
- Handles service selection and custom lot size inputs
- Not directly part of the address input flow but used in the broader application

## Testing Strategy

Each hook is tested independently:

- `useAddressLookup.test.ts` - Tests API interactions, state management, debouncing, and error handling
- `useInputState.test.ts` - Tests UI state derivation logic and suggestion deduplication
- `useKeyboardNavigation.test.ts` - Tests generic keyboard navigation behavior and focus management
- `useElementRefs.test.ts` - Tests dynamic ref array management and stability
- `useEventLogger.test.ts` - Tests event logging functionality and error handling
- `useLandscapeEstimator.test.ts` - Tests landscape estimation calculations and state management

The AddressInput component has integration tests that verify these hooks work together properly.

## Usage Example

```tsx
const AddressInput = () => {
  // Core address lookup functionality
  const {
    query,
    suggestions,
    handleChange,
    handleSelect,
    isFetching,
    locked,
    hasFetched,
    error
  } = useAddressLookup();

  // Derived UI states
  const {
    showLoading,
    showErrorAlert,
    showSuggestions,
    showClearButton,
    showEstimateButton,
    uniqueSuggestions
  } = useInputState(query, suggestions, isFetching, hasFetched, locked);

  // Dynamic refs for suggestion list
  const { elementRefs: suggestionRefs, getElementRefs } =
    useElementRefs<HTMLLIElement>(uniqueSuggestions.length);

  // Keyboard navigation
  const { handleTriggerKeyDown, handleElementKeyDown } = useKeyboardNavigation(
    inputRef,
    onSelect,
    getElementRefs
  );

  // Event logging
  const { logEvent } = useEventLogger();
  const { logAddressEvent } = useAddressEventLogger(
    logEvent,
    query,
    suggestions
  );

  // Component implementation...
};
```
