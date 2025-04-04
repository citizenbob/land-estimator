// src/components/PageAnalytics.tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import mixpanel from '@services/mixpanelClient';

export default function PageAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    mixpanel.track('Page Viewed', { path: pathname });
  }, [pathname]);

  return null;
}
