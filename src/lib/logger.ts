/**
 * Environment-aware logging utility
 * Only logs in development or when explicitly enabled
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isLoggingEnabled =
  isDevelopment || isTest || process.env.ENABLE_LOGGING === 'true';

/**
 * Log messages only in development environment
 */
export function devLog(...args: unknown[]): void {
  if (isLoggingEnabled) {
    console.log(...args);
  }
}

/**
 * Log warnings only in development environment
 */
export function devWarn(...args: unknown[]): void {
  if (isLoggingEnabled) {
    console.warn(...args);
  }
}

/**
 * Log errors (always logged, regardless of environment)
 */
export function logError(...args: unknown[]): void {
  console.error(...args);
}

/**
 * Log important production messages (always logged)
 */
export function prodLog(...args: unknown[]): void {
  console.log(...args);
}
