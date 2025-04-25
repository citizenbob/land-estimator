import mixpanel from 'mixpanel-browser';

/**
 * Logs an event to tracking and analytics platforms
 *
 * Sends the event data to Mixpanel and/or Firestore based on provided options.
 * Handles errors gracefully to prevent application failures during logging.
 *
 * @param eventName - Name of the event to log
 * @param data - Object containing event properties and values
 * @param options - Configuration object to determine destinations
 * @param options.toMixpanel - Whether to log to Mixpanel (defaults to true)
 * @param options.toFirestore - Whether to log to Firestore (defaults to true)
 */
export async function logEvent(
  eventName: string,
  data: Record<string, string | number | boolean | string[]>,
  options?: { toMixpanel?: boolean; toFirestore?: boolean }
): Promise<void> {
  const { toMixpanel = true, toFirestore = true } = options || {};

  if (toMixpanel) {
    try {
      mixpanel.track(eventName, data);
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
        body: JSON.stringify({ eventName, data })
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
