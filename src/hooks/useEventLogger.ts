import { logEvent as actualLogEvent } from '@services/logger';

export const useEventLogger = () => {
  const logEventToServices = async (
    eventName: string,
    data: Record<string, string | number | boolean | string[]>,
    options?: { toMixpanel?: boolean; toFirestore?: boolean }
  ) => {
    const { toMixpanel = true, toFirestore = false } = options || {};
    // Check if running in a Cypress test environment where window.logEvent might be stubbed.
    // If window.logEvent is defined, use it; otherwise, use the actual logEvent function.
    const loggerFn =
      typeof window !== 'undefined' && typeof window.logEvent === 'function'
        ? window.logEvent
        : actualLogEvent;

    try {
      await loggerFn({ eventName, data, toMixpanel, toFirestore });
    } catch (error) {
      console.error(`Error logging event: ${eventName}`, error);
    }
  };

  return { logEvent: logEventToServices };
};
