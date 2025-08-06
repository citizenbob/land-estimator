declare global {
  interface LogEventOptions {
    toMixpanel?: boolean;
    toFirestore?: boolean;
  }

  interface Window {
    logEvent: (
      eventName: string,
      data: Record<string, string | number | boolean | string[]>,
      options?: LogEventOptions
    ) => void;
  }
}

export {};
