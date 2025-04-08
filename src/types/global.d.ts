declare global {
  interface Window {
    logEvent: {
      (event: { eventName: string; data: Record<string, unknown> }): void;
      (eventName: string, data: Record<string, unknown>): void;
    };
  }
}

export {};
