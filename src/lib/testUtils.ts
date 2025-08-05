import { fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';
import { MOCK_LOCAL_ADDRESSES, TestItem, TestBundle } from './testData';
import { useAddressLookup } from '@hooks/useAddressLookup';
import { EventMap, LogOptions } from '@app-types/analytics';
import { normalizeQuery } from '@lib/addressTransforms';

/**
 * Types and selects a suggestion from an address input field
 * @param input - The input element to type into
 * @param textToType - Text to type into the input
 * @param suggestionDisplay - The display text of the suggestion to select
 * @returns The selected suggestion element
 */

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

/**
 * Changes the value of an input element by firing a change event
 * @param input - The HTML input element to modify
 * @param value - The new value to set
 */
export const changeInputValue = async (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

/**
 * Asserts that no additional API calls were made after a delay
 * @param mockFunction - The mocked function to check for additional calls
 * @param delay - Time to wait before checking (defaults to 600ms)
 */
export const assertNoExtraApiCalls = async (
  mockFunction: ReturnType<typeof vi.fn>,
  delay = 600
) => {
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
  expect(mockFunction.mock.calls.length).toBe(0);
};

/**
 * Verifies that a log event was called with the expected parameters
 * @param logEvent - The mocked log event function
 * @param eventName - The name of the event that should have been logged
 * @param data - The data that should have been passed to the log event
 * @param options - Optional logging options
 */
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

/**
 * Mocks a successful fetch response with the provided data
 * @param mockFetch - The mocked fetch function
 * @param data - The data to return in the response
 */
export const mockSuccessResponse = (
  mockFetch: ReturnType<typeof vi.fn>,
  data: unknown
) => {
  mockFetch.mockResolvedValueOnce(createMockResponse(data));
};

/**
 * Mocks a fetch response with an error status
 * @param mockFetch - The mocked fetch function
 * @param status - HTTP status code (defaults to 500)
 * @param statusText - HTTP status text (defaults to 'Internal Server Error')
 */
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

/**
 * Mocks a network error by rejecting the fetch promise
 * @param mockFetch - The mocked fetch function
 * @param errorMessage - The error message (defaults to 'Network error')
 */
export const mockNetworkError = (
  mockFetch: ReturnType<typeof vi.fn>,
  errorMessage = 'Network error'
) => {
  const error = new Error(errorMessage);
  mockFetch.mockRejectedValueOnce(error);
};

/**
 * Mocks a JSON parsing error in fetch responses
 * @param mockFetch - The mocked fetch function
 * @param errorMessage - The error message (defaults to 'Invalid JSON')
 */
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

/**
 * Creates a sequence of mock fetch responses for multiple calls
 * @param mockFetch - The mocked fetch function
 * @param responses - Array of response configurations
 */
export const mockFetchSequence = (
  mockFetch: ReturnType<typeof vi.fn>,
  responses: Array<{
    data: unknown;
    ok?: boolean;
    status?: number;
    statusText?: string;
  }>
) => {
  responses.forEach((response) => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse(response.data, {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      })
    );
  });
};

/**
 * Mocks a successful fetch response that returns JSON data
 * @param mockFetch - The mocked fetch function
 * @param data - The JSON data to return
 */
export const mockJsonResponse = (
  mockFetch: ReturnType<typeof vi.fn>,
  data: unknown
) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data)
  });
};

/**
 * Mocks multiple successful JSON responses in sequence
 * @param mockFetch - The mocked fetch function
 * @param dataArray - Array of JSON data to return in sequence
 */
export const mockJsonSequence = (
  mockFetch: ReturnType<typeof vi.fn>,
  dataArray: unknown[]
) => {
  dataArray.forEach((data) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data)
    });
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

/**
 * Gets all list items (options) from the current screen
 * @returns Promise resolving to array of option elements
 */
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

export function setupBrowserEnvironment() {
  if (typeof globalThis.window === 'undefined') {
    (globalThis as Record<string, unknown>).window = {
      document: globalThis.document || {},
      navigator: globalThis.navigator || { userAgent: 'Vitest' },
      location: { origin: 'http://localhost:3000' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
  }

  if (typeof globalThis.window?.addEventListener === 'undefined') {
    globalThis.window.addEventListener = vi.fn();
  }
  if (typeof globalThis.window?.removeEventListener === 'undefined') {
    globalThis.window.removeEventListener = vi.fn();
  }

  if (typeof globalThis.navigator === 'undefined') {
    (globalThis as Record<string, unknown>).navigator = { userAgent: 'Vitest' };
  }

  if (typeof globalThis.fetch === 'undefined') {
    (globalThis as Record<string, unknown>).fetch = vi.fn();
  }
}

export function setupNodeEnvironment() {
  vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
}

/**
 * Creates a standardized mock fetch function
 * @param assignToGlobal - Whether to assign the mock to global.fetch (defaults to true)
 * @returns The mock fetch function
 */
export function createMockFetch(assignToGlobal = true) {
  const mockFetch = vi.fn();
  if (assignToGlobal) {
    global.fetch = mockFetch;
  }
  return mockFetch;
}

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

export function setupMixpanelMocks() {
  const mockMixpanelTrack = vi.fn(() => true);

  vi.mock('mixpanel-browser', () => ({
    default: {
      track: () => true
    }
  }));

  return { mockMixpanelTrack };
}

export function createMockApiRecord(address: {
  id: string;
  full_address: string;
  region: string;
}) {
  return {
    id: address.id,
    display_name: address.full_address,
    region: address.region,
    normalized: normalizeQuery(address.full_address)
  };
}

/**
 * Creates a mock API record factory for use in test setup
 * @returns Function to create mock API records
 */
export function createMockApiRecordFactory() {
  return (address: (typeof MOCK_LOCAL_ADDRESSES)[0]) =>
    createMockApiRecord(address);
}

/**
 * Sets up standardized global mocks for testing environment
 * @param options - Configuration options for mock setup
 */
export function setupGlobalMocks(
  options: {
    includeFetch?: boolean;
    includeConsole?: boolean;
    includeTimers?: boolean;
  } = {}
) {
  const mocks: Record<string, unknown> = {};

  if (options.includeFetch !== false) {
    mocks.mockFetch = createMockFetch();
  }

  if (options.includeConsole !== false) {
    mocks.consoleMocks = createConsoleMocks();
  }

  if (options.includeTimers) {
    setupTestTimers();
    mocks.timersSetup = true;
  }

  return mocks;
}

/**
 * Cleans up all global mocks
 * @param mocks - The mocks object returned from setupGlobalMocks
 */
export function cleanupGlobalMocks(mocks: Record<string, unknown>) {
  if (
    mocks.consoleMocks &&
    typeof mocks.consoleMocks === 'object' &&
    'restore' in mocks.consoleMocks
  ) {
    (mocks.consoleMocks as { restore: () => void }).restore();
  }

  if (mocks.timersSetup) {
    cleanupTestTimers();
  }

  vi.clearAllMocks();
}

export function setupTestTimers(date = new Date(2025, 5, 1, 12, 0, 0)) {
  vi.useFakeTimers();
  vi.setSystemTime(date);
}

export function cleanupTestTimers() {
  vi.useRealTimers();
}

export function createTestRequest(data: unknown): Request {
  return { json: async () => data } as Request;
}

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

export function createResolvedMock<T>(data: T) {
  return vi.fn().mockResolvedValue(data);
}

export function createRejectedMock(error: Error) {
  return vi.fn().mockRejectedValue(error);
}

export function createSequentialMocks<T>(responses: T[]) {
  const mock = vi.fn();
  responses.forEach((response) => {
    mock.mockResolvedValueOnce(response);
  });
  return mock;
}

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

export function withSuppressedConsole<T>(fn: () => T): T {
  const mocks = createConsoleMocks();
  try {
    return fn();
  } finally {
    mocks.restore();
  }
}

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

export const setupWorkerMocks = (mockFetch: ReturnType<typeof vi.fn>) => {
  const { mockCache, mockCaches } = createCacheMocks();

  Object.defineProperty(global, 'caches', {
    value: mockCaches,
    writable: true
  });

  mockFetch.mockResolvedValue(createMockFetchResponse({}));

  return { mockCache, mockCaches };
};

/**
 * Sets up DOM and event listener mocks for component testing
 * @param options - Configuration for DOM setup
 */
export function setupDOMEnvironment(
  options: {
    documentReadyState?: 'loading' | 'interactive' | 'complete';
    windowLocation?: Partial<Location>;
    addEventListenerSpy?: boolean;
    removeEventListenerSpy?: boolean;
  } = {}
) {
  const spies: Record<string, ReturnType<typeof vi.spyOn>> = {};

  if (options.documentReadyState) {
    Object.defineProperty(document, 'readyState', {
      writable: true,
      value: options.documentReadyState
    });
  }

  if (options.windowLocation) {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, ...options.windowLocation }
    });
  }

  if (options.addEventListenerSpy) {
    spies.addEventListenerSpy = vi.spyOn(window, 'addEventListener');
  }

  if (options.removeEventListenerSpy) {
    spies.removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  }

  return {
    spies,
    cleanup: () => {
      Object.values(spies).forEach((spy) => spy.mockRestore());
    }
  };
}

/**
 * Common beforeEach setup pattern for component tests
 * @param options - Configuration options for test setup
 */
export function setupComponentTest(
  options: {
    consoleMocks?: boolean;
    mockFetch?: boolean;
    browserEnvironment?: boolean;
    timers?: boolean;
  } = {}
) {
  const setup: Record<string, unknown> = {};

  if (options.consoleMocks !== false) {
    setup.consoleMocks = createConsoleMocks();
  }

  if (options.mockFetch !== false) {
    setup.mockFetch = createMockFetch();
  }

  if (options.browserEnvironment !== false) {
    setupBrowserEnvironment();
  }

  if (options.timers) {
    setupTestTimers();
    setup.timersSetup = true;
  }

  vi.clearAllMocks();

  return setup;
}

/**
 * Common afterEach cleanup pattern for component tests
 * @param setup - The setup object returned from setupComponentTest
 */
export function cleanupComponentTest(setup: Record<string, unknown>) {
  if (
    setup.consoleMocks &&
    typeof setup.consoleMocks === 'object' &&
    'restore' in setup.consoleMocks
  ) {
    (setup.consoleMocks as { restore: () => void }).restore();
  }

  if (setup.timersSetup) {
    cleanupTestTimers();
  }

  vi.clearAllMocks();
  vi.restoreAllMocks();
}

/**
 * Enhanced component test setup utility that reduces boilerplate
 * @param options - Configuration options for component test setup
 */
export function setupComponentTestSuite(
  options: {
    consoleMocks?: boolean;
    mockFetch?: boolean;
    browserEnvironment?: boolean;
    timers?: boolean;
    documentReadyState?: 'loading' | 'interactive' | 'complete';
    mockMixpanel?: boolean;
    mockServiceWorker?: boolean;
  } = {}
) {
  let testContext: Record<string, unknown> = {};

  const beforeEachSetup = () => {
    testContext = setupComponentTest(options);

    if (options.documentReadyState) {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: options.documentReadyState
      });
    }

    if (options.mockMixpanel) {
      const mockMixpanel = {
        register: vi.fn(),
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        reset: vi.fn()
      };

      vi.doMock('@config/mixpanelClient', () => ({
        default: mockMixpanel
      }));

      testContext.mockMixpanel = mockMixpanel;
    }

    if (options.mockServiceWorker) {
      const mockServiceWorkerClient = {
        register: vi.fn().mockResolvedValue(true),
        preloadVersionedIndexes: vi.fn().mockResolvedValue(true),
        preloadStaticFiles: vi.fn().mockResolvedValue(true),
        warmupCache: vi.fn().mockResolvedValue(true)
      };

      vi.doMock('@workers/serviceWorkerClient', () => ({
        default: mockServiceWorkerClient
      }));

      testContext.mockServiceWorkerClient = mockServiceWorkerClient;
    }

    return testContext;
  };

  const afterEachCleanup = () => {
    cleanupComponentTest(testContext);
    vi.unstubAllEnvs();
  };

  return {
    beforeEachSetup,
    afterEachCleanup,
    getContext: () => testContext
  };
}

/**
 * Simple test suite setup for basic test patterns
 * @param options - Configuration options for test setup
 */
export function createTestSuite(
  options: {
    consoleMocks?: boolean;
    timers?: boolean;
    fetch?: boolean;
    browserEnvironment?: boolean;
  } = {}
) {
  const context: Record<string, unknown> = {};

  const beforeEachSetup = () => {
    if (options.consoleMocks !== false) {
      context.consoleMocks = createConsoleMocks();
    }

    if (options.timers) {
      setupTestTimers();
      context.timersSetup = true;
    }

    if (options.fetch !== false) {
      context.mockFetch = createMockFetch();
    }

    if (options.browserEnvironment !== false) {
      setupBrowserEnvironment();
    }

    vi.clearAllMocks();
    return context;
  };

  const afterEachCleanup = () => {
    if (
      context.consoleMocks &&
      typeof context.consoleMocks === 'object' &&
      'restore' in context.consoleMocks
    ) {
      (context.consoleMocks as { restore: () => void }).restore();
    }

    if (context.timersSetup) {
      cleanupTestTimers();
    }

    vi.clearAllMocks();
    vi.restoreAllMocks();
  };

  return {
    beforeEachSetup,
    afterEachCleanup,
    getContext: () => context
  };
}

/**
 * Standardized DOM property setter for consistent test environment setup
 * @param properties - Object mapping property paths to values
 */
export function setDOMProperties(properties: {
  'document.readyState'?: 'loading' | 'interactive' | 'complete';
  'document.referrer'?: string;
  'navigator.userAgent'?: string;
  'window.location'?: Partial<Location>;
}) {
  const cleanup: Array<() => void> = [];

  Object.entries(properties).forEach(([path, value]) => {
    const [object, property] = path.split('.');
    const target =
      object === 'document'
        ? document
        : object === 'navigator'
          ? navigator
          : object === 'window'
            ? window
            : null;

    if (target && property) {
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        target,
        property
      );

      Object.defineProperty(target, property, {
        writable: true,
        value
      });

      cleanup.push(() => {
        if (originalDescriptor) {
          Object.defineProperty(target, property, originalDescriptor);
        } else {
          delete (target as unknown as Record<string, unknown>)[property];
        }
      });
    }
  });

  return {
    cleanup: () => cleanup.forEach((fn) => fn())
  };
}

/**
 * Creates a standardized mock preload status for BackgroundPreloadStatus tests
 * @param overrides - Properties to override in the default status
 */
export function createMockPreloadStatus(
  overrides: Partial<{
    isLoading: boolean;
    isComplete: boolean;
    error: string | null;
    startTime: number | null;
    endTime: number | null;
  }> = {}
) {
  return {
    isLoading: false,
    isComplete: false,
    error: null,
    startTime: null,
    endTime: null,
    ...overrides
  };
}

/**
 * Standardized environment stubbing utility
 * @param env - Environment variables to stub
 */
export function stubEnvironment(env: Record<string, string>) {
  Object.entries(env).forEach(([key, value]) => {
    vi.stubEnv(key, value);
  });

  return {
    cleanup: () => vi.unstubAllEnvs()
  };
}

/**
 * Creates a complete test harness for components that need complex mocking
 * @param config - Configuration for the test harness
 */
export function createTestHarness(config: {
  mockMixpanel?: boolean;
  mockServiceWorker?: boolean;
  mockBackgroundPreloader?: boolean;
  environment?: Record<string, string>;
  domProperties?: Parameters<typeof setDOMProperties>[0];
}) {
  let domCleanup: (() => void) | null = null;
  let envCleanup: (() => void) | null = null;
  let componentSetup: ReturnType<typeof setupComponentTestSuite> | null = null;

  const setup = () => {
    if (config.environment) {
      envCleanup = stubEnvironment(config.environment).cleanup;
    }

    if (config.domProperties) {
      domCleanup = setDOMProperties(config.domProperties).cleanup;
    }

    componentSetup = setupComponentTestSuite({
      mockMixpanel: config.mockMixpanel,
      mockServiceWorker: config.mockServiceWorker,
      browserEnvironment: true,
      consoleMocks: true
    });

    const context = componentSetup.beforeEachSetup();

    if (config.mockBackgroundPreloader) {
      const mockBackgroundPreloader = {
        getStatus: vi.fn()
      };

      vi.doMock('@workers/backgroundPreloader', () => ({
        default: mockBackgroundPreloader
      }));

      context.mockBackgroundPreloader = mockBackgroundPreloader;
    }

    return context;
  };

  const cleanup = () => {
    componentSetup?.afterEachCleanup();
    domCleanup?.();
    envCleanup?.();
  };

  return { setup, cleanup };
}
