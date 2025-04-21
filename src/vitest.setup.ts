// src/vitest.setup.ts

import React from 'react';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/vitest';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Mock ResizeObserver
// ...existing code...

// Mock IntersectionObserver
// ...existing code...

// Add a basic mock for mixpanel-browser
// ...existing code...

// Runs a cleanup after each test case (e.g. clearing jsdom)
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

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<'img'>) =>
    React.createElement('img', props)
}));
