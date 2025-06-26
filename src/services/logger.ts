import mixpanel from 'mixpanel-browser';
import { EventMap, LogOptions } from '../types/analytics';
import { logError, createNetworkError } from '@lib/errorUtils';

/**
 * Logs an event to tracking and analytics platforms
 *
 * @template T - The event name (keyof EventMap)
 * @param {T} eventName - Name of the event to log
 * @param {EventMap[T]} data - Object containing event properties and values
 * @param {LogOptions} options - Configuration object to determine destinations
 */
export async function logEvent<T extends keyof EventMap>(
  eventName: T,
  data: EventMap[T],
  options?: LogOptions
): Promise<void> {
  const { toMixpanel = true, toFirestore = true } = options || {};

  const enrichedData = {
    ...data,
    timestamp:
      'timestamp' in data
        ? (data as { timestamp: number }).timestamp
        : Date.now()
  };

  if (toMixpanel) {
    try {
      mixpanel.track(String(eventName), enrichedData);
    } catch (error: unknown) {
      logError(error, {
        operation: 'mixpanel_track',
        eventName: String(eventName)
      });
    }
  }

  if (toFirestore) {
    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ eventName, data: enrichedData })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createNetworkError(
          `Error logging event to Firestore via API: ${response.status} ${response.statusText}`,
          {
            status: response.status,
            statusText: response.statusText,
            errorData
          }
        );
      }
    } catch (error: unknown) {
      logError(error, {
        operation: 'firestore_log',
        eventName: String(eventName)
      });
    }
  }
}
