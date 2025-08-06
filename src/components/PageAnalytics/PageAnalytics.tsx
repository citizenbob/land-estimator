// src/components/PageAnalytics.tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import mixpanel from '@services/mixpanelClient';

export default function PageAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      if (mixpanel && process.env.NEXT_PUBLIC_MIXPANEL) {
        mixpanel.track('Page Viewed', { path: pathname });
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }, [pathname]);

  return null;
}
