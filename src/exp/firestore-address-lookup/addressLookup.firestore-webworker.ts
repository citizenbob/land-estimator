// addressLookup.firestore-webworker.ts
// Main address lookup with Web Worker FlexSearch and API fallback

interface SearchResult {
  searchable: string;
  parcelId?: string;
}

interface WorkerStatus {
  status: 'loading' | 'ready' | 'error' | 'not-started';
  message: string;
}

// Worker management
let worker: Worker | null = null;
let workerStatus: WorkerStatus = {
  status: 'not-started',
  message: 'Not started'
};
let searchCounter = 0;
const pendingSearches = new Map<
  string,
  {
    resolve: (results: SearchResult[]) => void;
    reject: (error: Error) => void;
  }
>();

// Fallback API URL
const FALLBACK_API_URL = '/api/address-lookup';

/**
 * Initialize the Web Worker and start loading the index
 */
export function initializeFlexSearch(): void {
  if (worker) return;

  try {
    // Create the Web Worker
    worker = new Worker(new URL('./flexsearch-worker.ts', import.meta.url), {
      type: 'module'
    });

    // Handle messages from worker
    worker.addEventListener('message', (event) => {
      const { data } = event;

      switch (data.type) {
        case 'status':
          workerStatus = {
            status: data.status,
            message: data.message
          };

          // Emit status updates for UI (optional)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('flexsearch-status', {
                detail: workerStatus
              })
            );
          }
          break;

        case 'searchResult': {
          const pendingSearch = pendingSearches.get(data.id);
          if (pendingSearch) {
            pendingSearches.delete(data.id);

            if (data.error) {
              pendingSearch.reject(new Error(data.error));
            } else {
              pendingSearch.resolve(data.results || []);
            }
          }
          break;
        }

        default:
          console.warn('Unknown worker message:', data);
      }
    });

    // Handle worker errors
    worker.addEventListener('error', (error) => {
      console.error('FlexSearch worker error:', error);
      workerStatus = {
        status: 'error',
        message: `Worker error: ${error.message}`
      };
    });

    // Start loading the index
    worker.postMessage({ type: 'load' });
  } catch (error) {
    console.error('Failed to initialize FlexSearch worker:', error);
    workerStatus = {
      status: 'error',
      message: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Fallback API search using existing Firebase endpoint
 */
async function fallbackSearch(
  query: string,
  limit = 10
): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `${FALLBACK_API_URL}?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform API response to match our interface
    return (data.results || []).map((item: Record<string, unknown>) => ({
      searchable: (item.address as string) || (item.searchable as string) || '',
      parcelId: item.parcelId as string
    }));
  } catch (error) {
    console.error('Fallback search error:', error);
    return [];
  }
}

/**
 * Search using FlexSearch worker with fallback to API
 */
async function searchWithWorker(
  query: string,
  limit = 10
): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    if (!worker || workerStatus.status === 'error') {
      // Worker not available, reject to trigger fallback
      reject(new Error('Worker not available'));
      return;
    }

    const searchId = `search_${++searchCounter}_${Date.now()}`;

    // Store the pending promise
    pendingSearches.set(searchId, { resolve, reject });

    // Send search request to worker
    worker.postMessage({
      type: 'search',
      id: searchId,
      query,
      limit
    });

    // Timeout after 5 seconds and fall back to API
    setTimeout(() => {
      const pendingSearch = pendingSearches.get(searchId);
      if (pendingSearch) {
        pendingSearches.delete(searchId);
        reject(new Error('Worker search timeout'));
      }
    }, 5000);
  });
}

/**
 * Main address lookup function with automatic fallback
 */
export async function lookupAddressByPrefix(
  query: string,
  options: { limit?: number } = {}
): Promise<SearchResult[]> {
  const { limit = 10 } = options;
  const startTime = Date.now();

  // Validate input
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim();

  try {
    // Try FlexSearch first if worker is ready
    if (workerStatus.status === 'ready') {
      console.log(`🔍 FlexSearch lookup: "${trimmedQuery}"`);

      const results = await searchWithWorker(trimmedQuery, limit);
      const elapsed = Date.now() - startTime;

      console.log(
        `⚡ FlexSearch found ${results.length} results in ${elapsed}ms`
      );
      return results;
    }

    // Fallback to API
    console.log(
      `🔄 API fallback lookup: "${trimmedQuery}" (FlexSearch status: ${workerStatus.status})`
    );

    const results = await fallbackSearch(trimmedQuery, limit);
    const elapsed = Date.now() - startTime;

    console.log(`📡 API found ${results.length} results in ${elapsed}ms`);
    return results;
  } catch (error) {
    // If FlexSearch fails, try API fallback
    console.warn('FlexSearch failed, trying API fallback:', error);

    try {
      const results = await fallbackSearch(trimmedQuery, limit);
      const elapsed = Date.now() - startTime;

      console.log(
        `📡 Fallback API found ${results.length} results in ${elapsed}ms`
      );
      return results;
    } catch (fallbackError) {
      console.error('Both FlexSearch and API fallback failed:', fallbackError);
      return [];
    }
  }
}

/**
 * Get current FlexSearch status
 */
export function getFlexSearchStatus(): WorkerStatus {
  return workerStatus;
}

/**
 * Preload the FlexSearch index (call early in app initialization)
 */
export function preloadFlexSearch(): void {
  initializeFlexSearch();
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize on next tick to avoid blocking
  setTimeout(initializeFlexSearch, 0);
}
