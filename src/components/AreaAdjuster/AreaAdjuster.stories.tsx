import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AreaAdjuster } from './AreaAdjuster';
import { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';

const mockAddressData: EnrichedAddressSuggestion = {
  latitude: 40.7128,
  longitude: -74.006,
  region: 'test-region',
  place_id: 'test-place-id',
  display_name: '123 Test St, Test City, ST 12345',
  affluence_score: 50,
  calc: {
    landarea: 10000,
    building_sqft: 2000,
    estimated_landscapable_area: 6000,
    property_type: 'residential'
  }
};

const meta: Meta<typeof AreaAdjuster> = {
  title: 'Components/AreaAdjuster',
  component: AreaAdjuster,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A range slider component for adjusting landscapable area calculations. Allows users to fine-tune the area used for pricing estimates.'
      }
    }
  },
  argTypes: {
    addressData: {
      description: 'Address data containing property calculations',
      control: false
    },
    onAreaChange: {
      description: 'Callback fired when the area selection changes',
      action: 'area changed'
    },
    initialPercentage: {
      description: 'Initial percentage of total lot area to use',
      control: {
        type: 'range',
        min: 20,
        max: 100,
        step: 5
      }
    }
  },
  args: {
    onAreaChange: fn()
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    addressData: mockAddressData
  }
};

export const StartAt60Percent: Story = {
  args: {
    addressData: mockAddressData,
    initialPercentage: 60
  }
};

export const StartAt90Percent: Story = {
  args: {
    addressData: mockAddressData,
    initialPercentage: 90
  }
};

export const SmallLot: Story = {
  args: {
    addressData: {
      ...mockAddressData,
      calc: {
        ...mockAddressData.calc,
        landarea: 3000,
        estimated_landscapable_area: 2200
      }
    }
  }
};

export const LargeLot: Story = {
  args: {
    addressData: {
      ...mockAddressData,
      calc: {
        ...mockAddressData.calc,
        landarea: 25000,
        estimated_landscapable_area: 18000
      }
    }
  }
};

export const MinimumConstraint: Story = {
  args: {
    addressData: {
      ...mockAddressData,
      calc: {
        ...mockAddressData.calc,
        landarea: 5000,
        estimated_landscapable_area: 4500
      }
    },
    initialPercentage: 70
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows how the component respects the minimum estimated landscapable area, even when the initial percentage would result in a smaller area.'
      }
    }
  }
};
