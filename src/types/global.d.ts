declare global {
  interface LogEventOptions {
    toMixpanel?: boolean;
    toFirestore?: boolean;
  }

  interface LogEventPayload {
    eventName: string;
    data: Record<string, unknown>;
    toMixpanel?: boolean;
    toFirestore?: boolean;
  }

  interface Window {
    logEvent: {
      (payload: LogEventPayload): void;
      (
        eventName: string,
        data: Record<string, unknown>,
        options?: LogEventOptions
      ): void;
    };
  }
}

export {};
