/**
 * Shared utilities for environment variable validation
 */

/**
 * Validates required Firebase environment variables
 * @throws Error if any required variables are missing
 */
export function validateFirebaseCredentials() {
  const required = [
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

  // Log validation success
  console.log('🐛 Firebase Admin: Checking credentials...');
  required.forEach((key) => {
    console.log(`${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`);
  });
}
