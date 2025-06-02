import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logEvent } from '@services/logger';
import mixpanel from '@config/mixpanelClient';
import {
  mockSuccessResponse,
  mockErrorResponse,
  mockNetworkError,
  setupConsoleMocks
} from '@lib/testUtils';
import { ButtonClickEvent } from '../types/analytics';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const setupLoggerMocks = () => {
  vi.mock('mixpanel-browser', () => ({
    default: {
      track: vi.fn(() => true)
    }
  }));

  return {
    mockMixpanelTrack: mixpanel.track as ReturnType<typeof vi.fn>
  };
};

describe('logEvent', () => {
  const { mockMixpanelTrack } = setupLoggerMocks();
  let consoleSpies: {
    errorSpy: ReturnType<typeof vi.spyOn>;
    warnSpy: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    consoleSpies = setupConsoleMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const testEvent = 'button_clicked';
  const testData: ButtonClickEvent = { button_id: 'test_button' };

  it('logs the event name and data to Mixpanel', async () => {
    await logEvent(testEvent, testData, {
      toMixpanel: true,
      toFirestore: false
    });

    expect(mockMixpanelTrack).toHaveBeenCalledWith(
      testEvent,
      expect.objectContaining({
        button_id: testData.button_id,
        timestamp: expect.any(Number)
      })
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends the payload to the /api/log endpoint for Firestore', async () => {
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
      body: expect.stringMatching(
        /{"eventName":"button_clicked","data":{"button_id":"test_button","timestamp":\d+}}/
      )
    });
    expect(mockMixpanelTrack).not.toHaveBeenCalled();
  });

  it('handles Mixpanel logging errors gracefully', async () => {
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
      'Error logging event to Mixpanel:',
      expect.any(Error)
    );
  });

  it('handles API fetch errors gracefully for Firestore logging', async () => {
    mockErrorResponse(mockFetch, 500, 'Internal Server Error');

    await expect(
      logEvent(testEvent, testData, {
        toMixpanel: false,
        toFirestore: true
      })
    ).resolves.not.toThrow();

    expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error logging event to Firestore via API: 500'),
      expect.any(Object)
    );
  });

  it('handles network errors gracefully for Firestore logging', async () => {
    mockNetworkError(mockFetch, 'Network failed');

    await expect(
      logEvent(testEvent, testData, {
        toMixpanel: false,
        toFirestore: true
      })
    ).resolves.not.toThrow();

    expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
      'Error sending log event to API:',
      expect.any(Error)
    );
  });

  it('does not log to Mixpanel when toMixpanel is false', async () => {
    mockSuccessResponse(mockFetch, {});

    await logEvent(testEvent, testData, {
      toMixpanel: false,
      toFirestore: true
    });

    expect(mockMixpanelTrack).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not log to Firestore via API when toFirestore is false', async () => {
    await logEvent(testEvent, testData, {
      toMixpanel: true,
      toFirestore: false
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockMixpanelTrack).toHaveBeenCalledTimes(1);
  });

  it('adds a timestamp if one is not provided', async () => {
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
    const existingTimestamp = 1622540400000;
    const dataWithTimestamp: ButtonClickEvent = {
      button_id: 'test_button',
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
