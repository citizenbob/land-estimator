'use client';

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import AddressInput from '@components/AddressInput/AddressInput';
import { GeocodeResult } from '@typez/addressMatchTypes';

const baseLookupArgs = {
  query: '',
  suggestions: [] as GeocodeResult[],
  handleChange: fn(),
  handleSelect: fn(),
  isFetching: false,
  locked: false,
  hasFetched: false,
  error: null,
  selectedSuggestion: undefined
};

const meta: Meta<typeof AddressInput> = {
  title: 'Components/AddressInput',
  component: AddressInput,
  parameters: {
    docs: {
      description: {
        component:
          'The AddressInput component renders an input field with address suggestions, loading/error states, and interactive keyboard navigation. It utilizes the `useAddressLookup` hook internally, which can be mocked via the `mockLookup` prop for story isolation.'
      }
    },
    argTypes: {
      logEvent: { action: 'logEvent' },
      'mockLookup.handleChange': { action: 'handleChange' },
      'mockLookup.handleSelect': { action: 'handleSelect' }
    }
  },
  args: {
    mockLookup: baseLookupArgs,
    logEvent: fn()
  }
};

export default meta;
type Story = StoryObj<typeof AddressInput>;

export const Default: Story = {
  args: {
    mockLookup: {
      ...baseLookupArgs
    }
  }
};

export const Loading: Story = {
  args: {
    mockLookup: {
      ...baseLookupArgs,
      query: 'Fetching...',
      isFetching: true
    }
  }
};

export const WithSuggestions: Story = {
  args: {
    mockLookup: {
      ...baseLookupArgs,
      query: '1600',
      hasFetched: true,
      suggestions: [
        {
          displayName: '1600 Amphitheatre Parkway, Mountain View, CA',
          label: 'Google HQ',
          value: '1600 Amphitheatre Parkway, Mountain View, CA',
          lat: '37.4221',
          lon: '-122.0841'
        },
        {
          displayName: '1600 Pennsylvania Avenue NW, Washington, DC',
          label: 'White House',
          value: '1600 Pennsylvania Avenue NW, Washington, DC',
          lat: '38.8977',
          lon: '-77.0365'
        }
      ]
    }
  }
};

export const ErrorState: Story = {
  args: {
    mockLookup: {
      ...baseLookupArgs,
      query: 'Invalid Address Query That Returns No Results',
      hasFetched: true,
      suggestions: []
    }
  }
};

export const LockedWithCTA: Story = {
  args: {
    mockLookup: {
      ...baseLookupArgs,
      query: '1600 Amphitheatre Parkway, Mountain View, CA',
      locked: true,
      selectedSuggestion: {
        displayName: '1600 Amphitheatre Parkway, Mountain View, CA',
        label: 'Google HQ',
        value: '1600 Amphitheatre Parkway, Mountain View, CA',
        lat: '37.4221',
        lon: '-122.0841'
      }
    }
  }
};
