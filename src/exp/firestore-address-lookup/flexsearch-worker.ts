// flexsearch-worker.ts
// Web Worker for loading and searching FlexSearch index from Firebase Storage

import FlexSearch from 'flexsearch';

const FLEXSEARCH_INDEX_URL =
  'https://firebasestorage.googleapis.com/v0/b/land-estimator-29ee9.firebasestorage.app/o/cdn%2Fflexsearch-index.json.gz?alt=media';

interface IndexEntry {
  id: number;
  searchable: string;
  parcelId?: string;
}

interface IndexData {
  entries: IndexEntry[];
  metadata: {
    totalEntries: number;
    buildTime: string;
    sourceUrl: string;
    version: string;
    indexConfig: {
      tokenize: string;
      cache: number;
      resolution: number;
    };
  };
}

interface SearchMessage {
  type: 'search';
  id: string;
  query: string;
  limit?: number;
}

interface LoadMessage {
  type: 'load';
}

type WorkerMessage = SearchMessage | LoadMessage;

let flexIndex: FlexSearch.Index | null = null;
let indexData: IndexData | null = null;
let isLoading = false;
let isReady = false;

async function decompressGzip(data: ArrayBuffer): Promise<string> {
  // Use CompressionStream API if available (newer browsers)
  if ('CompressionStream' in globalThis) {
    const stream = new DecompressionStream('gzip');
    const response = new Response(data);
    const decompressed = await new Response(
      response.body?.pipeThrough(stream)
    ).text();
    return decompressed;
  }

  throw new Error('Gzip decompression not supported in this environment');
}

async function loadIndex(): Promise<void> {
  if (isLoading || isReady) return;

  isLoading = true;

  try {
    self.postMessage({
      type: 'status',
      status: 'loading',
      message: 'Downloading FlexSearch index...'
    });

    const response = await fetch(FLEXSEARCH_INDEX_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch index: ${response.statusText}`);
    }

    const compressedData = await response.arrayBuffer();

    self.postMessage({
      type: 'status',
      status: 'loading',
      message: 'Decompressing index...'
    });

    const jsonText = await decompressGzip(compressedData);
    indexData = JSON.parse(jsonText) as IndexData;

    self.postMessage({
      type: 'status',
      status: 'loading',
      message: 'Building search index...'
    });

    const { tokenize, ...otherConfig } = indexData.metadata.indexConfig;
    flexIndex = new FlexSearch.Index({
      ...otherConfig,
      tokenize: tokenize as 'forward' | 'reverse' | 'full' | undefined
    });

    const batchSize = 5000;
    for (let i = 0; i < indexData.entries.length; i += batchSize) {
      const batch = indexData.entries.slice(i, i + batchSize);

      for (const entry of batch) {
        flexIndex.add(entry.id, entry.searchable);
      }

      if (i % 25000 === 0) {
        const progress = Math.round((i / indexData.entries.length) * 100);
        self.postMessage({
          type: 'status',
          status: 'loading',
          message: `Building search index... ${progress}%`
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    isReady = true;
    isLoading = false;

    self.postMessage({
      type: 'status',
      status: 'ready',
      message: `FlexSearch index ready with ${indexData.entries.length} entries`
    });
  } catch (error) {
    isLoading = false;
    self.postMessage({
      type: 'status',
      status: 'error',
      message: `Failed to load index: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

function search(query: string, limit = 10): IndexEntry[] {
  if (!isReady || !flexIndex || !indexData) {
    return [];
  }

  try {
    const searchResults = flexIndex.search(query, { limit });

    return searchResults.map((id: number) => {
      const entry = indexData!.entries[id];
      return {
        id: entry.id,
        searchable: entry.searchable,
        parcelId: entry.parcelId
      };
    });
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { data } = event;

  switch (data.type) {
    case 'load':
      await loadIndex();
      break;

    case 'search':
      if (isReady) {
        const results = search(data.query, data.limit);
        self.postMessage({
          type: 'searchResult',
          id: data.id,
          results
        });
      } else {
        self.postMessage({
          type: 'searchResult',
          id: data.id,
          results: [],
          error: 'Index not ready'
        });
      }
      break;

    default:
      console.warn('Unknown message type:', data);
  }
});
