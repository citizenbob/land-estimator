import { useCallback } from 'react';
import { logEvent } from '@services/logger';

export const useEventLogger = () => {
  const logEventToServices = useCallback(
    async (
      eventName: string,
      data: Record<string, unknown>,
      options?: { toMixpanel?: boolean; toFirestore?: boolean }
    ) => {
      const { toMixpanel = true, toFirestore = false } = options || {};

      try {
        await logEvent({ eventName, data, toMixpanel, toFirestore });
      } catch (error) {
        console.error(`Error logging event: ${eventName}`, error);
      }
    },
    []
  );

  return { logEvent: logEventToServices };
};
