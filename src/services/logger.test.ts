import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logEvent } from '@services/logger';
import mixpanel from '@config/mixpanelClient';
import {
  mockSuccessResponse,
  mockErrorResponse,
  mockNetworkError,
  createTestSuite
} from '@lib/testUtils';
import { MOCK_ANALYTICS_EVENTS } from '@lib/testData';

describe('logEvent', () => {
  const testSuite = createTestSuite({
    consoleMocks: true,
    timers: true,
    fetch: true
  });
  const mockMixpanelTrack = mixpanel.track as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    testSuite.beforeEachSetup();
  });

  afterEach(() => {
    testSuite.afterEachCleanup();
  });

  // Helper to get mocks from test context
  const getMockFetch = () =>
    testSuite.getContext().mockFetch as ReturnType<typeof vi.fn>;
  const getConsoleSpies = () =>
    testSuite.getContext().consoleMocks as {
      errorSpy: ReturnType<typeof vi.spyOn>;
      warnSpy: ReturnType<typeof vi.spyOn>;
    };

  const testEvent = 'address_selected';
  const testData = MOCK_ANALYTICS_EVENTS.ADDRESS_SELECTED;

  it('logs the event name and data to Mixpanel', async () => {
    const mockFetch = getMockFetch();

    await logEvent(testEvent, testData, {
      toMixpanel: true,
      toFirestore: false
    });

    expect(mockMixpanelTrack).toHaveBeenCalledWith(
      testEvent,
      expect.objectContaining({
        query: testData.query,
        address_id: testData.address_id,
        position_in_results: testData.position_in_results,
        timestamp: expect.any(Number)
      })
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends the payload to the /api/log endpoint for Firestore', async () => {
    const mockFetch = getMockFetch();
    mockSuccessResponse(mockFetch, { success: true });

    await logEvent(testEvent, testData, {
      toMixpanel: false,
      toFirestore: true
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventName: testEvent,
        data: {
          ...testData,
          timestamp: Date.now()
        }
      })
    });
    expect(mockMixpanelTrack).not.toHaveBeenCalled();
  });

  it('handles Mixpanel logging errors gracefully', async () => {
    const consoleSpies = getConsoleSpies();

    mockMixpanelTrack.mockImplementationOnce(() => {
      throw new Error('Mixpanel error');
    });

    await expect(
      logEvent(testEvent, testData, {
        toMixpanel: true,
        toFirestore: false
      })
    ).resolves.not.toThrow();

    expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
      '[Error]',
      expect.objectContaining({
        message: 'Mixpanel error',
        context: expect.objectContaining({
          operation: 'mixpanel_track',
          eventName: 'address_selected'
        })
      })
    );
  });

  it('handles API fetch errors gracefully for Firestore logging', async () => {
    const mockFetch = getMockFetch();
    const consoleSpies = getConsoleSpies();

    mockErrorResponse(mockFetch, 500, 'Internal Server Error');

    await expect(
      logEvent(testEvent, testData, {
        toMixpanel: false,
        toFirestore: true
      })
    ).resolves.not.toThrow();

    expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
      '[Error]',
      expect.objectContaining({
        message: expect.stringContaining(
          'Error logging event to Firestore via API: 500'
        ),
        context: expect.objectContaining({
          operation: 'firestore_log',
          eventName: 'address_selected'
        }),
        type: 'NETWORK_ERROR',
        isRetryable: true,
        errorContext: expect.objectContaining({
          status: 500,
          statusText: 'Internal Server Error'
        })
      })
    );
  });

  it('handles network errors gracefully for Firestore logging', async () => {
    const mockFetch = getMockFetch();
    const consoleSpies = getConsoleSpies();

    mockNetworkError(mockFetch, 'Network failed');

    await expect(
      logEvent(testEvent, testData, {
        toMixpanel: false,
        toFirestore: true
      })
    ).resolves.not.toThrow();

    expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
      '[Error]',
      expect.objectContaining({
        message: 'Network failed',
        context: expect.objectContaining({
          operation: 'firestore_log',
          eventName: 'address_selected'
        })
      })
    );
  });

  it('does not log to Mixpanel when toMixpanel is false', async () => {
    const mockFetch = getMockFetch();

    mockSuccessResponse(mockFetch, {});

    await logEvent(testEvent, testData, {
      toMixpanel: false,
      toFirestore: true
    });

    expect(mockMixpanelTrack).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not log to Firestore via API when toFirestore is false', async () => {
    const mockFetch = getMockFetch();

    await logEvent(testEvent, testData, {
      toMixpanel: true,
      toFirestore: false
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockMixpanelTrack).toHaveBeenCalledTimes(1);
  });

  it('adds a timestamp if one is not provided', async () => {
    const mockFetch = getMockFetch();

    mockSuccessResponse(mockFetch, { success: true });

    await logEvent(testEvent, testData, {
      toMixpanel: true,
      toFirestore: true
    });

    expect(mockMixpanelTrack).toHaveBeenCalledWith(testEvent, {
      ...testData,
      timestamp: Date.now()
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventName: testEvent,
        data: {
          ...testData,
          timestamp: Date.now()
        }
      })
    });
  });

  it('preserves existing timestamp if one is provided', async () => {
    const mockFetch = getMockFetch();
    const existingTimestamp = 1622540400000;
    const dataWithTimestamp = {
      ...testData,
      timestamp: existingTimestamp
    };

    mockSuccessResponse(mockFetch, { success: true });

    await logEvent(testEvent, dataWithTimestamp, {
      toMixpanel: true,
      toFirestore: true
    });

    expect(mockMixpanelTrack).toHaveBeenCalledWith(
      testEvent,
      dataWithTimestamp
    );
    expect(mockFetch).toHaveBeenCalledWith('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventName: testEvent,
        data: dataWithTimestamp
      })
    });
  });
});
