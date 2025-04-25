import { logEvent as actualLogEvent } from '@services/logger';

/**
 * Hook for consistent event logging across components
 *
 * Provides a wrapper around the logger service that:
 * - Ensures consistent default options for logging events
 * - Properly handles Cypress test environment integration
 * - Gracefully handles any errors during the logging process
 *
 * @returns Object containing the logEvent method
 */
export const useEventLogger = () => {
  const logEventToServices = async (
    eventName: string,
    data: Record<string, string | number | boolean | string[]>,
    options?: { toMixpanel?: boolean; toFirestore?: boolean }
  ) => {
    const defaultOptions = {
      toMixpanel: true,
      toFirestore: true
    };
    const mergedOptions = { ...defaultOptions, ...options };

    const loggerFn =
      typeof window !== 'undefined' && typeof window.logEvent === 'function'
        ? window.logEvent
        : actualLogEvent;

    try {
      await loggerFn(eventName, data, mergedOptions);

      if (
        typeof window !== 'undefined' &&
        typeof window.logEvent === 'function' &&
        window.logEvent !== actualLogEvent &&
        mergedOptions.toFirestore !== false
      ) {
        try {
          await fetch('/api/log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ eventName, data })
          });
        } catch (error) {
          console.debug('Error in test environment API call:', error);
        }
      }
    } catch (error) {
      console.error(`Error logging event: ${eventName}`, error);
    }
  };

  return { logEvent: logEventToServices };
};
