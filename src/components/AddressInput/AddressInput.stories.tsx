'use client';

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import AddressInput from '@components/AddressInput/AddressInput';
import { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';

const baseLookupArgs = {
  query: '',
  suggestions: [] as EnrichedAddressSuggestion[],
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
          display_name: '1600 Amphitheatre Parkway, Mountain View, CA',
          place_id: '1234',
          latitude: 37.4221,
          longitude: -122.0841,
          region: 'Mountain View',
          calc: {
            landarea: 10000,
            building_sqft: 2000,
            estimated_landscapable_area: 8000,
            property_type: 'commercial'
          },
          affluence_score: 85
        } as EnrichedAddressSuggestion,
        {
          display_name: '1600 Pennsylvania Avenue NW, Washington, DC',
          place_id: '5678',
          latitude: 38.8977,
          longitude: -77.0365,
          region: 'Washington DC',
          calc: {
            landarea: 15000,
            building_sqft: 5000,
            estimated_landscapable_area: 10000,
            property_type: 'government'
          },
          affluence_score: 95
        } as EnrichedAddressSuggestion
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
        display_name: '1600 Amphitheatre Parkway, Mountain View, CA',
        place_id: '1234',
        latitude: 37.4221,
        longitude: -122.0841,
        region: 'Mountain View',
        calc: {
          landarea: 10000,
          building_sqft: 2000,
          estimated_landscapable_area: 8000,
          property_type: 'commercial'
        },
        affluence_score: 85
      } as EnrichedAddressSuggestion
    }
  }
};
