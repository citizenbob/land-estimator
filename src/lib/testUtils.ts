import { fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';
import { MOCK_LOCAL_ADDRESSES, TestItem, TestBundle } from './testData';
import { useAddressLookup } from '@hooks/useAddressLookup';
import { EventMap, LogOptions } from '@app-types';

export const typeAndSelectSuggestion = async (
  input: HTMLElement,
  textToType: string,
  suggestionDisplay: string
) => {
  const userEvent = (await import('@testing-library/user-event')).default;
  await userEvent.type(input, textToType);
  const suggestion = await waitFor(() =>
    screen.getByText(
      (_, element) =>
        element?.getAttribute('data-display') === suggestionDisplay
    )
  );
  fireEvent.click(suggestion);
  return suggestion;
};

export const changeInputValue = async (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

export const assertNoExtraApiCalls = async (
  mockFunction: ReturnType<typeof vi.fn>,
  delay = 600
) => {
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
  expect(mockFunction.mock.calls.length).toBe(0);
};

export const verifyLogEventCall = <T extends keyof EventMap>(
  logEvent: ReturnType<typeof vi.fn>,
  eventName: T,
  data: Partial<EventMap[T]>,
  options?: LogOptions
) => {
  if (options) {
    expect(logEvent).toHaveBeenCalledWith(
      eventName,
      expect.objectContaining(data),
      options
    );
  } else {
    expect(logEvent).toHaveBeenCalledWith(
      eventName,
      expect.objectContaining(data)
    );
  }
};

export const mockSuccessResponse = (
  mockFetch: ReturnType<typeof vi.fn>,
  data: unknown
) => {
  mockFetch.mockResolvedValueOnce(createMockResponse(data));
};

export const mockErrorResponse = (
  mockFetch: ReturnType<typeof vi.fn>,
  status = 500,
  statusText = 'Internal Server Error'
) => {
  mockFetch.mockResolvedValueOnce(
    createMockResponse(null, {
      ok: false,
      status,
      statusText
    })
  );
};

export const mockNetworkError = (
  mockFetch: ReturnType<typeof vi.fn>,
  errorMessage = 'Network error'
) => {
  const error = new Error(errorMessage);
  mockFetch.mockRejectedValueOnce(error);
};

export const mockJsonParsingError = (
  mockFetch: ReturnType<typeof vi.fn>,
  errorMessage = 'Invalid JSON'
) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => {
      throw new SyntaxError(errorMessage);
    }
  });
};

export const setupConsoleMocks = createConsoleMocks;

export const verifyUniqueSuggestions = async () => {
  const items = await waitFor(() => screen.getAllByRole('option'));
  const displays = items
    .map((item) => item.getAttribute('data-display'))
    .filter(Boolean);
  const uniqueDisplays = [...new Set(displays)];
  expect(displays.length).toBe(uniqueDisplays.length);
  expect(uniqueDisplays.length).toBeGreaterThan(0);
};

export const getListItems = async () => screen.getAllByRole('option');

/**
 * Creates a standardized mock for useAddressLookup
 *
 * @param overrides Properties to override in the default mock
 * @returns A mock object that can be used with AddressInput's mockLookup prop
 */
export function createAddressLookupMock(
  overrides: Partial<ReturnType<typeof useAddressLookup>> = {}
) {
  const handleChange = vi.fn();
  const handleSelect = vi.fn();

  const getSuggestionData = vi.fn(async (id: string) => {
    const localAddress = MOCK_LOCAL_ADDRESSES.find((addr) => addr.id === id);
    if (localAddress) {
      return {
        id: localAddress.id,
        full_address: localAddress.full_address,
        region: localAddress.region,
        latitude: localAddress.latitude,
        longitude: localAddress.longitude,
        calc: {
          landarea: localAddress.calc?.landarea || 0,
          building_sqft: localAddress.calc?.building_sqft || 0,
          estimated_landscapable_area:
            localAddress.calc?.estimated_landscapable_area || 0,
          property_type: localAddress.calc?.property_type || 'unknown'
        },
        owner: {
          name: localAddress.owner?.name || 'Unknown'
        },
        affluence_score: localAddress.affluence_score || 0,
        source_file: localAddress.source_file || 'Unknown',
        processed_date: localAddress.processed_date || new Date().toISOString()
      };
    }
    return undefined;
  });

  const defaultMock = {
    query: '',
    suggestions: [] as { place_id: string; display_name: string }[],
    isFetching: false,
    locked: false,
    hasFetched: false,
    error: null,
    handleChange,
    handleSelect,
    getSuggestionData
  };

  return {
    ...defaultMock,
    ...overrides
  };
}

/**
 * Creates a standardized mock for NominatimApiClient
 *
 * @param overrides Custom behavior for the mock methods
 * @returns A mocked NominatimApiClient with configured behavior
 */
export function createNominatimApiClientMock(
  overrides: {
    fetchSuggestions?: ReturnType<typeof vi.fn>;
    fetchCoordinates?: ReturnType<typeof vi.fn>;
  } = {}
) {
  return {
    fetchSuggestions:
      overrides.fetchSuggestions || vi.fn().mockResolvedValue([]),
    fetchCoordinates:
      overrides.fetchCoordinates || vi.fn().mockResolvedValue({})
  };
}

/**
 * Creates a mock search index with common methods
 */
export function createMockSearchIndex() {
  return {
    add: vi.fn(),
    search: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    export: vi.fn(),
    import: vi.fn()
  };
}

/**
 * Sets up browser environment for tests
 */
export function setupBrowserEnvironment() {
  /**
   * Ensure window object exists (JSDOM should provide this)
   */
  if (typeof globalThis.window === 'undefined') {
    (globalThis as Record<string, unknown>).window = {
      document: globalThis.document || {},
      navigator: globalThis.navigator || { userAgent: 'Vitest' },
      location: { origin: 'http://localhost:3000' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
  }

  /**
   * Ensure window has event listener methods
   */
  if (typeof globalThis.window?.addEventListener === 'undefined') {
    globalThis.window.addEventListener = vi.fn();
  }
  if (typeof globalThis.window?.removeEventListener === 'undefined') {
    globalThis.window.removeEventListener = vi.fn();
  }

  /**
   * Ensure navigator exists and has required properties
   */
  if (typeof globalThis.navigator === 'undefined') {
    (globalThis as Record<string, unknown>).navigator = { userAgent: 'Vitest' };
  }

  /**
   * Set up fetch mock
   */
  if (typeof globalThis.fetch === 'undefined') {
    (globalThis as Record<string, unknown>).fetch = vi.fn();
  }
}

/**
 * Sets up Node.js environment for tests
 */
export function setupNodeEnvironment() {
  vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
}

/**
 * Creates a standardized mock fetch function
 */
export function createMockFetch() {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;
  return mockFetch;
}

/**
 * Sets up Firestore admin mocks for API tests
 */
export function setupFirestoreAdminMocks() {
  const mockAdd = vi.fn();

  vi.doMock('@config/firebaseAdmin', () => ({
    firestoreAdmin: {
      collection: () => ({ add: mockAdd })
    }
  }));

  vi.doMock('firebase-admin/firestore', () => ({
    FieldValue: {
      serverTimestamp: () => 'SERVER_TIMESTAMP'
    }
  }));

  return { mockAdd };
}

/**
 * Sets up Mixpanel mocks for analytics tests
 */
export function setupMixpanelMocks() {
  const mockMixpanelTrack = vi.fn(() => true);

  vi.mock('mixpanel-browser', () => ({
    default: {
      track: mockMixpanelTrack
    }
  }));

  return { mockMixpanelTrack };
}

/**
 * Creates a mock API record from local address data
 */
export function createMockApiRecord(address: {
  id: string;
  full_address: string;
  region: string;
}) {
  return {
    id: address.id,
    display_name: address.full_address,
    region: address.region,
    normalized: address.full_address.toLowerCase()
  };
}

/**
 * Sets up fake timers with a specific date
 */
export function setupTestTimers(date = new Date(2025, 5, 1, 12, 0, 0)) {
  vi.useFakeTimers();
  vi.setSystemTime(date);
}

/**
 * Cleans up test timers
 */
export function cleanupTestTimers() {
  vi.useRealTimers();
}

/**
 * Creates a standardized test request object for API routes
 */
export function createTestRequest(data: unknown): Request {
  return { json: async () => data } as Request;
}

/**
 * Factory function for creating consistent fetch response mocks
 */
export function createMockResponse(
  data: unknown,
  options: {
    ok?: boolean;
    status?: number;
    statusText?: string;
  } = {}
) {
  const { ok = true, status = 200, statusText = 'OK' } = options;

  return {
    ok,
    status,
    statusText,
    json: async () => data
  };
}

/**
 * Creates a mock function that resolves with provided data
 */
export function createResolvedMock<T>(data: T) {
  return vi.fn().mockResolvedValue(data);
}

/**
 * Creates a mock function that rejects with provided error
 */
export function createRejectedMock(error: Error) {
  return vi.fn().mockRejectedValue(error);
}

/**
 * Creates a series of mock responses for sequential calls
 */
export function createSequentialMocks<T>(responses: T[]) {
  const mock = vi.fn();
  responses.forEach((response) => {
    mock.mockResolvedValueOnce(response);
  });
  return mock;
}

/**
 * Creates a mock that alternates between success and failure
 */
export function createAlternatingMock<T>(
  successData: T,
  errorData: Error,
  startWithSuccess = true
) {
  const mock = vi.fn();
  let shouldSucceed = startWithSuccess;

  mock.mockImplementation(() => {
    const result = shouldSucceed
      ? Promise.resolve(successData)
      : Promise.reject(errorData);
    shouldSucceed = !shouldSucceed;
    return result;
  });

  return mock;
}

/**
 * Console testing utilities for consistent mock setup
 */
export function createConsoleMocks() {
  const originalConsole = { ...console };

  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

  const restore = () => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
    infoSpy.mockRestore();
  };

  return {
    errorSpy,
    warnSpy,
    logSpy,
    infoSpy,
    restore,
    originalConsole
  };
}

/**
 * Temporarily suppress console output during test execution
 */
export function withSuppressedConsole<T>(fn: () => T): T {
  const mocks = createConsoleMocks();
  try {
    return fn();
  } finally {
    mocks.restore();
  }
}

/**
 * Creates a console spy that captures output for assertion
 */
export function createConsoleCapture() {
  const messages: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((message) => {
    messages.push(String(message));
  });

  return {
    spy,
    messages,
    getLastMessage: () => messages[messages.length - 1],
    getAllMessages: () => [...messages],
    clear: () => messages.splice(0, messages.length),
    restore: () => spy.mockRestore()
  };
}

/**
 * Worker-specific test utilities
 */

/**
 * Creates a mock fetch response with consistent structure
 */
export const createMockFetchResponse = (
  data: unknown,
  ok = true,
  status = 200
) => ({
  ok,
  status,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
  json: () => Promise.resolve(data)
});

/**
 * Creates standardized cache mocks for service worker testing
 */
export const createCacheMocks = () => {
  const mockCache = {
    match: vi.fn(),
    keys: vi.fn()
  };
  const mockCaches = {
    open: vi.fn().mockResolvedValue(mockCache),
    keys: vi.fn().mockResolvedValue(['versioned-index-cache-v1'])
  };
  return { mockCache, mockCaches };
};

/**
 * Standard test configuration for versioned bundle loader
 */
export const createTestConfig = () => ({
  baseFilename: 'address-index',
  createLookupMap: vi.fn(
    (data: TestItem[]): Record<string, TestItem> =>
      data.reduce((acc, item) => ({ ...acc, [item.id]: item }), {})
  ),
  extractDataFromIndex: vi.fn(
    (index: { data?: TestItem[] }): TestItem[] => index.data || []
  ),
  createBundle: vi.fn(
    (data: TestItem[], lookup: Record<string, TestItem>): TestBundle => ({
      data,
      lookup,
      count: data.length
    })
  )
});

/**
 * Sets up consistent mock environment for worker tests
 */
export const setupWorkerMocks = (mockFetch: ReturnType<typeof vi.fn>) => {
  const { mockCache, mockCaches } = createCacheMocks();

  Object.defineProperty(global, 'caches', {
    value: mockCaches,
    writable: true
  });

  mockFetch.mockResolvedValue(createMockFetchResponse({}));

  return { mockCache, mockCaches };
};
