// src/vitest.setup.ts

import React from 'react';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/vitest';

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

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<'img'>) =>
    React.createElement('img', props)
}));
