import * as admin from 'firebase-admin';

const hasCredentials =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

function initializeFirebase() {
  if (!hasCredentials) {
    console.warn(
      'Firebase credentials missing - Firebase services not initialized'
    );
    return false;
  }

  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      });
      return true;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Firebase Admin SDK initialization error:', error.stack);
      } else {
        console.error('Firebase Admin SDK initialization error:', error);
      }
      return false;
    }
  }

  return true;
}

const isInitialized = initializeFirebase();

const firestoreAdmin = isInitialized
  ? admin.firestore()
  : ({
      collection: () => ({
        /* mock implementation */
      })
    } as unknown as admin.firestore.Firestore);

export { admin, firestoreAdmin };
