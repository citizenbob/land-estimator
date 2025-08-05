import { EnvironmentVariables } from '@app-types/configTypes';

export function validateFirebaseCredentials(): void {
  const required: Array<keyof EnvironmentVariables> = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      'Firebase credentials missing - cannot initialize Firebase services\n' +
        'Missing: ' +
        missing.join(', ')
    );
  }

  console.log('🐛 Firebase Admin: Checking credentials...');
  required.forEach((key) => {
    console.log(`${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`);
  });
}

export function validateEnvironment(): EnvironmentVariables {
  return {
    NODE_ENV:
      (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
      'development',
    NEXT_PUBLIC_MIXPANEL: process.env.NEXT_PUBLIC_MIXPANEL,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    VERCEL_ENV: process.env.VERCEL_ENV,
    ENABLE_LOGGING: process.env.ENABLE_LOGGING
  };
}
