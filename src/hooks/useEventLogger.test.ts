import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEventLogger } from './useEventLogger';
import * as loggerModule from '@services/logger';
import { EstimateButtonClickedEvent } from '../types/analytics';
import { createTestSuite } from '@lib/testUtils';
import { MOCK_ANALYTICS_EVENTS } from '@lib/testData';

describe('useEventLogger', () => {
  const testSuite = createTestSuite({ consoleMocks: true });
  const mockLogEvent = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    testSuite.beforeEachSetup();
    vi.spyOn(loggerModule, 'logEvent').mockImplementation(mockLogEvent);
  });

  afterEach(() => {
    testSuite.afterEachCleanup();
  });

  it('uses the logger service with default options', async () => {
    const { result } = renderHook(() => useEventLogger());

    const testEvent: EstimateButtonClickedEvent =
      MOCK_ANALYTICS_EVENTS.ESTIMATE_BUTTON_CLICKED;

    await act(async () => {
      await result.current.logEvent('estimate_button_clicked', testEvent);
    });

    expect(mockLogEvent).toHaveBeenCalledWith(
      'estimate_button_clicked',
      testEvent,
      {
        toMixpanel: true,
        toFirestore: true
      }
    );
  });

  it('applies provided options to the log event', async () => {
    const { result } = renderHook(() => useEventLogger());

    const testEvent: EstimateButtonClickedEvent = {
      address_id: '456-def'
    };

    await act(async () => {
      await result.current.logEvent('estimate_button_clicked', testEvent, {
        toMixpanel: false,
        toFirestore: true
      });
    });

    expect(mockLogEvent).toHaveBeenCalledWith(
      'estimate_button_clicked',
      testEvent,
      {
        toMixpanel: false,
        toFirestore: true
      }
    );
  });

  it('handles errors gracefully', async () => {
    const testError = new Error('Test error');
    mockLogEvent.mockRejectedValueOnce(testError);

    const { result } = renderHook(() => useEventLogger());

    const errorEvent: EstimateButtonClickedEvent = {
      address_id: '789-ghi'
    };

    const consoleSpies = testSuite.getContext().consoleMocks as {
      errorSpy: ReturnType<typeof vi.spyOn>;
      warnSpy: ReturnType<typeof vi.spyOn>;
    };

    await act(async () => {
      await result.current.logEvent('estimate_button_clicked', errorEvent);
    });

    expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
      '[Error]',
      expect.objectContaining({
        message: 'Test error',
        severity: 'medium'
      })
    );
  });
});
