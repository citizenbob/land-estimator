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
          display_name: '1600 Amphitheatre Parkway',
          place_id: 1
        },
        {
          display_name: '1 Infinite Loop',
          place_id: 2
        }
      ]}
      onSelect={() => {}}
      suggestionRefs={[]}
      onSuggestionKeyDown={() => {}}
    />
  )
};
