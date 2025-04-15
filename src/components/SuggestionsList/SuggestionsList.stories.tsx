import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SuggestionsList from './SuggestionsList';

const meta: Meta<typeof SuggestionsList> = {
  title: 'Components/SuggestionsList',
  component: SuggestionsList,
  parameters: {
    docs: {
      description: {
        component:
          'The SuggestionsList component displays a list of suggestions.'
      }
    }
  }
};

export default meta;

type Story = StoryObj<typeof SuggestionsList>;

export const Default: Story = {
  render: () => (
    <SuggestionsList
      suggestions={[
        {
          displayName: '1600 Amphitheatre Parkway',
          label: 'Google HQ',
          latitude: '37.422',
          longitude: '-122.084',
          value: 'google-hq'
        },
        {
          displayName: '1 Infinite Loop',
          label: 'Apple HQ',
          latitude: '37.331',
          longitude: '-122.031',
          value: 'apple-hq'
        }
      ]}
      onSelect={() => {}}
      onKeyDown={() => {}}
    />
  )
};
