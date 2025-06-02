import mixpanel from 'mixpanel-browser';
import { EventMap, LogOptions } from '../types/analytics';

/**
 * Logs an event to tracking and analytics platforms
 *
 * Sends the event data to Mixpanel and/or Firestore based on provided options.
 * Handles errors gracefully to prevent application failures during logging.
 *
 * @template T - The event name (keyof EventMap)
 * @param eventName - Name of the event to log
 * @param data - Object containing event properties and values
 * @param options - Configuration object to determine destinations
 * @param options.toMixpanel - Whether to log to Mixpanel (defaults to true)
 * @param options.toFirestore - Whether to log to Firestore (defaults to true)
 */
export async function logEvent<T extends keyof EventMap>(
  eventName: T,
  data: EventMap[T],
  options?: LogOptions
): Promise<void> {
  const { toMixpanel = true, toFirestore = true } = options || {};

  const enrichedData = {
    ...data,
    timestamp: data.timestamp || Date.now()
  };

  if (toMixpanel) {
    try {
      mixpanel.track(String(eventName), enrichedData);
    } catch (error: unknown) {
      console.error('Error logging event to Mixpanel:', error);
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
        console.error(
          `Error logging event to Firestore via API: ${response.status} ${response.statusText}`,
          errorData
        );
      }
    } catch (error: unknown) {
      console.error('Error sending log event to API:', error);
    }
  }
}
