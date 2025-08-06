const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isLoggingEnabled =
  isDevelopment || isTest || process.env.ENABLE_LOGGING === 'true';

export function devLog(...args: unknown[]): void {
  if (isLoggingEnabled) {
    console.log(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (isLoggingEnabled) {
    console.warn(...args);
  }
}

export function logError(...args: unknown[]): void {
  console.error(...args);
}

export function prodLog(...args: unknown[]): void {
  console.log(...args);
}
