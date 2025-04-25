import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEventLogger } from './useEventLogger';
import * as loggerModule from '@services/logger';

describe('useEventLogger', () => {
  const mockLogEvent = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(loggerModule, 'logEvent').mockImplementation(mockLogEvent);
  });

  it('uses the logger service with default options', async () => {
    const { result } = renderHook(() => useEventLogger());

    await act(async () => {
      await result.current.logEvent('Test Event', { foo: 'bar' });
    });

    expect(mockLogEvent).toHaveBeenCalledWith(
      'Test Event',
      { foo: 'bar' },
      { toMixpanel: true, toFirestore: true }
    );
  });

  it('applies provided options to the log event', async () => {
    const { result } = renderHook(() => useEventLogger());

    await act(async () => {
      await result.current.logEvent(
        'Test Event',
        { foo: 'bar' },
        {
          toMixpanel: false,
          toFirestore: true
        }
      );
    });

    expect(mockLogEvent).toHaveBeenCalledWith(
      'Test Event',
      { foo: 'bar' },
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

    await act(async () => {
      await result.current.logEvent('Error Test', { data: 'value' });
    });

    expect(console.error).toHaveBeenCalledWith(
      'Error logging event: Error Test',
      testError
    );
  });
});
