import React from 'react';
import type { Preview } from '@storybook/react';

import '../src/app/globals.css';

export const decorators = [
  (Story) => (
    <div className="bg-background text-foreground font-sans antialiased">
      <Story />
    </div>
  )
];

const preview: Preview = {
  parameters: {
    a11y: {
      element: '#root',
      config: {},
      options: {}
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  }
};

export default preview;
