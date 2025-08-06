/**
 * Mixpanel Initializer Component
 * Handles client-side initialization of Mixpanel analytics
 */

'use client';

import { useEffect } from 'react';
import mixpanel from '@config/mixpanelClient';

/**
 * MixpanelInitializer Component
 * Ensures Mixpanel is properly initialized on the client side
 */
export default function MixpanelInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const initMixpanel = () => {
      try {
        console.log('[Mixpanel] Initializing analytics...');

        if (process.env.NEXT_PUBLIC_MIXPANEL) {
          mixpanel.register({
            page_load_time: Date.now(),
            user_agent: navigator.userAgent,
            referrer: document.referrer || 'direct'
          });

          console.log('[Mixpanel] Analytics initialized successfully');
        } else {
          console.warn('[Mixpanel] Token not configured, analytics disabled');
        }
      } catch (error) {
        console.error('[Mixpanel] Initialization failed:', error);
      }
    };

    if (document.readyState === 'complete') {
      initMixpanel();
    } else {
      window.addEventListener('load', initMixpanel);
      return () => window.removeEventListener('load', initMixpanel);
    }
  }, []);

  return null;
}
