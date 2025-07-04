import type { Meta, StoryObj } from '@storybook/react';
import { EstimateCalculator } from './EstimateCalculator';
import type { EnrichedAddressSuggestion } from '@app-types';

const mockAddressData: EnrichedAddressSuggestion = {
  place_id: '1',
  display_name: '123 Main St, St. Louis, MO',
  latitude: 38.63569,
  longitude: -90.24407,
  region: 'St. Louis City',
  calc: {
    landarea: 8000,
    building_sqft: 1500,
    estimated_landscapable_area: 7000,
    property_type: 'residential'
  },
  affluence_score: 50
};

const meta: Meta<typeof EstimateCalculator> = {
  title: 'Components/EstimateCalculator',
  component: EstimateCalculator,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Allows users to customize services and view a dynamic landscaping cost estimate based on address data.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with mock address data. Users can interact with controls to update the estimate.
 */
export const Default: Story = {
  args: {
    addressData: mockAddressData
  }
};
