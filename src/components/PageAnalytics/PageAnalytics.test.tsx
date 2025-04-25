import React from 'react';
import { render } from '@testing-library/react';
import { vi, expect } from 'vitest';

vi.mock('@config/mixpanelClient', () => ({
  __esModule: true,
  default: {
    track: vi.fn()
  }
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/test-path'
}));

import Analytics from './PageAnalytics';
import mixpanel from '@config/mixpanelClient';

describe('Analytics Component', () => {
  it('tracks a page view with the correct path on mount', () => {
    render(<Analytics />);
    expect(mixpanel.track).toHaveBeenCalledWith('Page Viewed', {
      path: '/test-path'
    });
  });
});
