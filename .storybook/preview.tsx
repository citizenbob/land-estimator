import React from 'react';
import type { Preview } from '@storybook/react';

import '../src/app/globals.css';
import { ThemeProvider } from 'styled-components';
import defaultTheme from '../src/app/default_theme';

export const decorators = [
  (Story) => (
    <ThemeProvider theme={defaultTheme}>
      <Story />
    </ThemeProvider>
  ),
];

const preview: Preview = {
  parameters: {
    a11y: {
      // Global configuration for accessibility testing
      element: '#root',
      config: {},
      options: {},
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
