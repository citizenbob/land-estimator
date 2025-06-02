import { EventMap, LogOptions } from './types/analytics';

declare global {
  interface Window {
    /**
     * Optional logging function available during tests
     * Matches the signature of the main logger function
     */
    logEvent?: <T extends keyof EventMap>(
      eventName: T,
      data: EventMap[T],
      options?: LogOptions
    ) => Promise<void> | void;
  }
}

// This empty export is needed to make this a module
export {};
