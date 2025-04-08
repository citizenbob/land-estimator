import mixpanel from 'mixpanel-browser';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { app } from './firebaseClient';

const db = getFirestore(app);

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
