import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'land-NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
  measurementId: 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      if (process.env.NODE_ENV === 'development') {
        console.log('Firebase analytics initialized:', analytics);
      }
    }
  });
}

// Initialize Firestore
const db = getFirestore(app);
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase Firestore initialized:', db);
}

// Test function to write to Firestore (only active in development)
export const testFirestoreWrite = async () => {
  if (process.env.NODE_ENV !== 'development') return;
  try {
    const docRef = await addDoc(collection(db, 'testCollection'), {
      timestamp: new Date().toISOString(),
      message: 'This is a test document.'
    });
    console.log('Document written with ID:', docRef.id);
  } catch (error) {
    console.error('Error adding document:', error);
  }
};

export { app, analytics, db };
