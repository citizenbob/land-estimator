import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { validateFirebaseCredentials } from '../lib/envValidation';
import { logError } from '@lib/errorUtils';
import { FirebaseConfig } from '@app-types/configTypes';

let firebaseApp: App | null = null;

function getFirebaseConfig(): FirebaseConfig {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  return {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: privateKey!,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  };
}

function ensureFirebaseApp(): App {
  if (firebaseApp) {
    return firebaseApp;
  }

  validateFirebaseCredentials();

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0];
      console.log('✅ Using existing Firebase Admin app');
      return firebaseApp;
    }

    const config = getFirebaseConfig();
    firebaseApp = initializeApp({
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey
      }),
      storageBucket:
        config.storageBucket || `${config.projectId}.firebasestorage.app`
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
