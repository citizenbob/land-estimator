'use client';

import { useEffect } from 'react';
import serviceWorkerClient from '@workers/serviceWorkerClient';

/**
 * Service Worker Registration Component
 * Handles automatic registration and preloading of versioned indexes
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const initServiceWorker = async () => {
      try {
        console.log('[SW Registration] Initializing service worker...');

        const registered = await serviceWorkerClient.register();

        if (registered) {
          console.log(
            '[SW Registration] Service worker registered successfully'
          );

          setTimeout(async () => {
            try {
              console.log('[SW Registration] Starting background preload...');
              await serviceWorkerClient.preloadVersionedIndexes();
              console.log('[SW Registration] Background preload completed');
            } catch (error) {
              console.warn(
                '[SW Registration] Background preload failed:',
                error
              );
            }
          }, 2000);
        } else {
          console.log(
            '[SW Registration] Service worker registration failed or not supported'
          );
        }
      } catch (error) {
        console.error(
          '[SW Registration] Service worker initialization failed:',
          error
        );
      }
    };

    if (document.readyState === 'complete') {
      initServiceWorker();
    } else {
      window.addEventListener('load', initServiceWorker);
      return () => window.removeEventListener('load', initServiceWorker);
    }
  }, []);

  return null;
}
