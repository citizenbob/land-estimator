import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { validateFirebaseCredentials } from '../lib/envValidation';
import { logError } from '@lib/errorUtils';

let firebaseApp: App | null = null;

function ensureFirebaseApp(): App {
  if (firebaseApp) {
    return firebaseApp;
  }

  validateFirebaseCredentials();

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0];
      console.log('✅ Using existing Firebase Admin app');
      return firebaseApp;
    }

    firebaseApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: privateKey!
      }),
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error: unknown) {
    logError(error, {
      operation: 'firebase_admin_init'
    });
    throw error;
  }
}

export const firestoreAdmin = {
  collection(name: string) {
    return getFirestore(ensureFirebaseApp()).collection(name);
  }
};

export const storageAdmin = {
  bucket() {
    return getStorage(ensureFirebaseApp()).bucket();
  }
};

export const admin = {
  apps: getApps
};
