import * as admin from 'firebase-admin';

// Only attempt to initialize Firebase if we have credentials
const hasCredentials =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

// Process the private key to handle escaped newlines
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Create a safe initialization function
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

// Initialize Firebase
const isInitialized = initializeFirebase();

// Get Firestore instance, but safely return a mock if Firebase isn't initialized
const firestoreAdmin = isInitialized
  ? admin.firestore()
  : ({
      collection: () => ({
        /* mock implementation */
      })
    } as unknown as admin.firestore.Firestore);

export { admin, firestoreAdmin };
