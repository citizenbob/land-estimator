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

const db = getFirestore(app);

export { app, analytics, db };
