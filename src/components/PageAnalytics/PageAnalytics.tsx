'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import mixpanel from '@config/mixpanelClient';

export default function PageAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    mixpanel.track('Page Viewed', { path: pathname });
  }, [pathname]);

  return null;
}
