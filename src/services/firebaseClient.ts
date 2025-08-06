import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_MAIN_API,
  authDomain: process.env.NEXT_PUBLIC_FB_MAIN_AUTH,
  projectId: process.env.NEXT_PUBLIC_FB_MAIN_PROJECT,
  storageBucket: process.env.NEXT_PUBLIC_FB_MAIN_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MAIN_MSG_ID,
  appId: process.env.NEXT_PUBLIC_FB_MAIN_APP,
  measurementId: process.env.NEXT_PUBLIC_FB_MAIN_MEASURE
};

// Only initialize Firebase if we have a projectId
let app: ReturnType<typeof initializeApp> | null = null;
let analytics: ReturnType<typeof getAnalytics> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (firebaseConfig.projectId) {
  app = initializeApp(firebaseConfig);
  
  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported && app) {
        analytics = getAnalytics(app);
        if (process.env.NODE_ENV === 'development') {
          console.log('Firebase analytics initialized:', analytics);
        }
      }
    }).catch((error) => {
      console.warn('Firebase analytics initialization failed:', error);
    });
  }

  db = getFirestore(app);
} else {
  console.warn('Firebase not configured - missing projectId');
}

export { app, analytics, db };
