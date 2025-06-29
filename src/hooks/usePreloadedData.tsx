import {
  useEffect,
  useContext,
  createContext,
  ReactNode,
  useState
} from 'react';
import { loadVersionedBundle } from '@workers/versionedBundleLoader';

interface Bundle {
  data: unknown[];
  lookup: Record<string, unknown>;
  count: number;
}

interface PreloadContextValue {
  addressIndex: Bundle | null;
  parcelMetadata: Bundle | null;
  isLoading: boolean;
  error: string | null;
}

const PreloadContext = createContext<PreloadContextValue>({
  addressIndex: null,
  parcelMetadata: null,
  isLoading: false,
  error: null
});

export function usePreloadedData() {
  return useContext(PreloadContext);
}

export function PreloadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PreloadContextValue>({
    addressIndex: null,
    parcelMetadata: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function preloadBundles() {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const addressConfig = {
          baseFilename: 'address-index',
          createLookupMap: (data: unknown[]): Record<string, unknown> => {
            const lookup: Record<string, unknown> = {};
            data.forEach((item) => {
              if (item && typeof item === 'object' && 'id' in item) {
                lookup[(item as { id: string }).id] = item;
              }
            });
            return lookup;
          },
          extractDataFromIndex: (index: { addresses?: unknown[] }) =>
            index.addresses || [],
          createBundle: (
            data: unknown[],
            lookup: Record<string, unknown>
          ): Bundle => ({
            data,
            lookup,
            count: data.length
          })
        };

        const parcelConfig = {
          baseFilename: 'parcel-metadata',
          createLookupMap: (data: unknown[]): Record<string, unknown> => {
            const lookup: Record<string, unknown> = {};
            data.forEach((item) => {
              if (item && typeof item === 'object' && 'parcelId' in item) {
                lookup[(item as { parcelId: string }).parcelId] = item;
              }
            });
            return lookup;
          },
          extractDataFromIndex: (index: { parcels?: unknown[] }) =>
            index.parcels || [],
          createBundle: (
            data: unknown[],
            lookup: Record<string, unknown>
          ): Bundle => ({
            data,
            lookup,
            count: data.length
          })
        };

        const [addressIndex, parcelMetadata] = await Promise.all([
          loadVersionedBundle(addressConfig),
          loadVersionedBundle(parcelConfig)
        ]);

        if ('indexedDB' in window) {
          try {
            const request = indexedDB.open('PreloadCache', 1);
            request.onupgradeneeded = () => {
              const db = request.result;
              if (!db.objectStoreNames.contains('bundles')) {
                db.createObjectStore('bundles', { keyPath: 'key' });
              }
            };
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction(['bundles'], 'readwrite');
              const store = transaction.objectStore('bundles');

              store.put({
                key: 'addressIndex',
                data: addressIndex,
                timestamp: Date.now()
              });
              store.put({
                key: 'parcelMetadata',
                data: parcelMetadata,
                timestamp: Date.now()
              });
            };
          } catch (indexedDBError) {
            console.warn('IndexedDB storage failed:', indexedDBError);
          }
        }

        setState({
          addressIndex,
          parcelMetadata,
          isLoading: false,
          error: null
        });

        console.log('🚀 Preloaded bundles successfully:', {
          addressCount: addressIndex.count,
          parcelCount: parcelMetadata.count
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));

        console.error('Failed to preload bundles:', error);
      }
    }

    preloadBundles();
  }, []);

  return (
    <PreloadContext.Provider value={state}>{children}</PreloadContext.Provider>
  );
}
