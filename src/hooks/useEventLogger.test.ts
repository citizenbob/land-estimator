import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEventLogger } from './useEventLogger';
import * as loggerModule from '@services/logger';
import { EstimateButtonClickedEvent } from '../types/analytics';

describe('useEventLogger', () => {
  const mockLogEvent = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(loggerModule, 'logEvent').mockImplementation(mockLogEvent);
  });

  it('uses the logger service with default options', async () => {
    const { result } = renderHook(() => useEventLogger());

    const testEvent: EstimateButtonClickedEvent = {
      address_id: '123-abc'
    };

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

    await act(async () => {
      await result.current.logEvent('estimate_button_clicked', errorEvent);
    });

    expect(console.error).toHaveBeenCalledWith(
      'Error logging event: estimate_button_clicked',
      testError
    );
  });
});
