import mixpanel from 'mixpanel-browser';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { app, db } from './firebaseClient';

export async function logEvent({
  eventName,
  data
}: {
  eventName: string;
  data: Record<string, unknown>;
}): Promise<void> {
  try {
    mixpanel.track(eventName, data);
  } catch (error) {
    console.error('Error logging event to Mixpanel:', error);
  }

  // Only try to log to Firestore if Firebase is available
  if (db && app) {
    try {
      await addDoc(collection(db, 'landscapeEstimates'), {
        eventName,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging event to Firestore:', error);
    }
  }
}

if (typeof window !== 'undefined') {
  function unifiedLogEvent(
    eventOrEventName:
      | string
      | { eventName: string; data: Record<string, unknown> },
    data?: Record<string, unknown>
  ): void {
    if (typeof eventOrEventName === 'string') {
      logEvent({ eventName: eventOrEventName, data: data! });
    } else {
      logEvent(eventOrEventName);
    }
  }
  window.logEvent = unifiedLogEvent;
}

export { app, db };
