// src/vitest.setup.ts

import React from 'react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

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
