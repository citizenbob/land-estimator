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

    try {
      // First call the actual logger to ensure API calls are always made
      await actualLogEvent(eventName, data, mergedOptions);

      // Then call the test stub if it exists (for test assertions)
      if (
        typeof window !== 'undefined' &&
        typeof window.logEvent === 'function' &&
        window.logEvent !== actualLogEvent
      ) {
        await window.logEvent(eventName, data, mergedOptions);
      }
    } catch (error) {
      console.error(`Error logging event: ${eventName}`, error);
    }
  };

  return { logEvent: logEventToServices };
};
