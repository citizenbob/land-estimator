import { useCallback } from 'react';
import { logEvent as actualLogEvent } from '@services/logger';

const getLogger = () => {
  if (typeof window !== 'undefined' && window.Cypress && window.cypressLogger) {
    console.log('CYPRESS: Using window.cypressLogger');
    return window.cypressLogger;
  }
  console.log('CYPRESS: Using actualLogEvent');
  return actualLogEvent;
};

export const useEventLogger = () => {
  const logEventToServices = useCallback(
    async (
      eventName: string,
      data: Record<string, unknown>,
      options?: { toMixpanel?: boolean; toFirestore?: boolean }
    ) => {
      const loggerFn = getLogger();
      const { toMixpanel = true, toFirestore = false } = options || {};

      try {
        await loggerFn({ eventName, data, toMixpanel, toFirestore });
      } catch (error) {
        console.error(`Error logging event: ${eventName}`, error);
      }
    },
    []
  );

  return { logEvent: logEventToServices };
};

declare global {
  interface Window {
    Cypress?: object;
    cypressLogger?: (payload: {
      eventName: string;
      data: Record<string, unknown>;
      toMixpanel?: boolean;
      toFirestore?: boolean;
    }) => Promise<void>;
  }
}
