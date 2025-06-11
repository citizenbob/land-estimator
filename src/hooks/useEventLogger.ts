import { logEvent as actualLogEvent } from '@services/logger';
import { EventMap, LogOptions } from '../types/analytics';

/**
 * Hook for consistent event logging across components
 *
 * @returns {object} Object containing the logEvent method
 */
export const useEventLogger = () => {
  const logEventToServices = async <T extends keyof EventMap>(
    eventName: T,
    data: EventMap[T],
    options?: LogOptions
  ) => {
    const defaultOptions = {
      toMixpanel: true,
      toFirestore: true
    };
    const mergedOptions = { ...defaultOptions, ...options };

    try {
      await actualLogEvent(eventName, data, mergedOptions);

      if (
        typeof window !== 'undefined' &&
        typeof window.logEvent === 'function'
      ) {
        const testLogger = window.logEvent as unknown as typeof actualLogEvent;
        await testLogger(eventName, data, mergedOptions);
      }
    } catch (error) {
      console.error(`Error logging event: ${eventName}`, error);
    }
  };

  return { logEvent: logEventToServices };
};
