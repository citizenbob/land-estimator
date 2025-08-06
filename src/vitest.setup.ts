import React from 'react';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/vitest';

process.env.NEXT_PUBLIC_MIXPANEL = 'test-token';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

vi.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/'
    };
  }
}));

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});

/**
 * Enhance navigator object for tests that need clipboard or other APIs
 */
if (typeof globalThis.navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      userAgent: 'Vitest',
      clipboard: {
        writeText: vi.fn(),
        readText: vi.fn()
      }
    },
    writable: true,
    configurable: true
  });
} else if (!globalThis.navigator.clipboard) {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: {
      writeText: vi.fn(),
      readText: vi.fn()
    },
    writable: true,
    configurable: true
  });
}

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<'img'>) =>
    React.createElement('img', props)
}));

vi.mock('mixpanel-browser', () => {
  const mockMixpanelTrack = vi.fn(() => true);
  const mockMixpanelInit = vi.fn();
  const mockMixpanelRegister = vi.fn();
  const mockMixpanelIdentify = vi.fn();
  const mockMixpanelReset = vi.fn();

  return {
    default: {
      init: mockMixpanelInit,
      register: mockMixpanelRegister,
      track: mockMixpanelTrack,
      identify: mockMixpanelIdentify,
      reset: mockMixpanelReset
    }
  };
});
