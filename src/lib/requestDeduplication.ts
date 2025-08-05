class RequestDeduplicator<T> {
  private activeRequests = new Map<string, Promise<T>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Deduplicate requests by key, ensuring only one request per key is active
   * @param key - Unique identifier for the request
   * @param requestFn - Function that performs the actual request
   * @returns Promise resolving to the request result
   */
  async deduplicate(key: string, requestFn: () => Promise<T>): Promise<T> {
    const existingRequest = this.activeRequests.get(key);
    if (existingRequest) {
      console.log(`🔄 [Dedup] Reusing active request for: ${key}`);
      return existingRequest;
    }

    console.log(`🚀 [Dedup] Starting new request for: ${key}`);
    const requestPromise = requestFn().finally(() => {
      this.activeRequests.delete(key);
    });

    this.activeRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Debounced request - delays execution until no new requests for the same key
   * @param key - Unique identifier for the request
   * @param requestFn - Function that performs the actual request
   * @param delay - Debounce delay in milliseconds
   * @returns Promise resolving to the request result
   */
  async debounce(
    key: string,
    requestFn: () => Promise<T>,
    delay: number = 300
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        try {
          const result = await this.deduplicate(key, requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Combined debounce + deduplicate - debounces input but deduplicates identical active requests
   * @param key - Unique identifier for the request
   * @param requestFn - Function that performs the actual request
   * @param delay - Debounce delay in milliseconds
   * @returns Promise resolving to the request result
   */
  async debouncedDedupe(
    key: string,
    requestFn: () => Promise<T>,
    delay: number = 300
  ): Promise<T> {
    const existingRequest = this.activeRequests.get(key);
    if (existingRequest) {
      console.log(`⚡ [DebouncedDedup] Reusing active request for: ${key}`);
      return existingRequest;
    }

    return this.debounce(key, requestFn, delay);
  }

  clear(): void {
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
    this.activeRequests.clear();
  }

  getStats(): {
    activeRequests: number;
    pendingDebounces: number;
    requestKeys: string[];
  } {
    return {
      activeRequests: this.activeRequests.size,
      pendingDebounces: this.debounceTimers.size,
      requestKeys: Array.from(this.activeRequests.keys())
    };
  }
}

/**
 * Normalize query strings for consistent deduplication keys
 * @param query - Raw query string
 * @returns Normalized query string
 */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Create a deduplication key for address lookup requests
 * @param query - Search query
 * @returns Unique key for deduplication
 */
export function createLookupKey(query: string): string {
  const normalized = normalizeQuery(query);
  return `lookup:${normalized}`;
}

export const addressLookupDeduplicator = new RequestDeduplicator<unknown>();

/**
 * Utility function for deduplicated address lookups
 * @param query - Search query
 * @param lookupFn - Function that performs the actual lookup
 * @param options - Deduplication options
 * @returns Promise resolving to lookup results
 */
export async function deduplicatedLookup<T>(
  query: string,
  lookupFn: (normalizedQuery: string) => Promise<T>,
  options: {
    debounce?: boolean;
    debounceDelay?: number;
  } = {}
): Promise<T> {
  const { debounce = true, debounceDelay = 250 } = options;
  const normalizedQuery = normalizeQuery(query);
  const key = createLookupKey(normalizedQuery);

  const deduplicator = new RequestDeduplicator<T>();
  const requestFn = () => lookupFn(normalizedQuery);

  if (debounce) {
    return deduplicator.debouncedDedupe(key, requestFn, debounceDelay);
  } else {
    return deduplicator.deduplicate(key, requestFn);
  }
}

export { RequestDeduplicator };
