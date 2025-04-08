'use client';

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import AddressInput from './AddressInput';

const meta: Meta<typeof AddressInput> = {
  title: 'Components/AddressInput',
  component: AddressInput,
  parameters: {
    docs: {
      description: {
        component:
          'The AddressInput component renders an input field with address suggestions and interactive keyboard navigation. This story demonstrates its various states including default, loading, suggestions, and error states.'
      }
    }
  }
};

export default meta;

type Story = StoryObj<typeof AddressInput>;

const baseLookup = {
  query: '',
  suggestions: [],
  handleChange: (value: string) => console.log('handleChange:', value),
  handleSelect: (value: string) => console.log('handleSelect:', value),
  isFetching: false,
  locked: false,
  hasFetched: false
};

export const Default: Story = {
  render: () => <AddressInput mockLookup={{ ...baseLookup }} />
};

export const Loading: Story = {
  render: () => (
    <AddressInput
      mockLookup={{
        ...baseLookup,
        isFetching: true
      }}
    />
  )
};

export const WithSuggestions: Story = {
  render: () => (
    <AddressInput
      mockLookup={{
        ...baseLookup,
        query: '1600',
        hasFetched: true,
        suggestions: [
          {
            displayName: '1600 Amphitheatre Parkway, Mountain View, CA',
            label: 'Google HQ',
            value: '1600 Amphitheatre Parkway, Mountain View, CA'
          },
          {
            displayName: '1600 Some Other Road, Some City, ST',
            label: 'Other Location',
            value: '1600 Some Other Road, Some City, ST'
          }
        ]
      }}
    />
  )
};

export const ErrorState: Story = {
  render: () => (
    <AddressInput
      mockLookup={{
        ...baseLookup,
        query: 'Invalid',
        suggestions: [],
        hasFetched: true
      }}
    />
  )
};

export const LockedWithCTA: Story = {
  render: () => (
    <AddressInput
      mockLookup={{
        ...baseLookup,
        query: '1600 Amphitheatre Parkway, Mountain View, CA',
        locked: true
      }}
    />
  )
};
