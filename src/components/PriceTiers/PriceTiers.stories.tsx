import type { Meta, StoryObj } from '@storybook/react';
import { PriceTiers } from './PriceTiers';
import { PriceTier } from '@app-types/landscapeEstimatorTypes';

const mockTiers: PriceTier[] = [
  {
    tier: 'curb_appeal',
    rate: 4.5,
    designFee: 500,
    installationCost: 2250,
    maintenanceMonthly: 200,
    finalEstimate: 2750
  },
  {
    tier: 'full_lawn',
    rate: 8,
    designFee: 800,
    installationCost: 4000,
    maintenanceMonthly: 300,
    finalEstimate: 4800
  },
  {
    tier: 'dream_lawn',
    rate: 12,
    designFee: 1200,
    installationCost: 6000,
    maintenanceMonthly: 500,
    finalEstimate: 7200
  }
];

const meta: Meta<typeof PriceTiers> = {
  title: 'Components/PriceTiers',
  component: PriceTiers,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A component to display three-tier pricing options for landscape services.'
      }
    }
  },
  argTypes: {
    tiers: {
      description: 'Array of pricing tiers to display',
      control: 'object'
    },
    selectedTier: {
      description: 'Currently selected pricing tier',
      control: {
        type: 'select',
        options: ['curb_appeal', 'full_lawn', 'dream_lawn']
      }
    },
    onTierSelect: {
      description: 'Callback function when a tier is selected',
      action: 'tier-selected'
    },
    lotSizeSqFt: {
      description:
        'Lot size in square feet (shows rate per sq ft when provided)',
      control: 'number'
    },
    isLoading: {
      description: 'Whether the component is in a loading state',
      control: 'boolean'
    }
  }
};

export default meta;
type Story = StoryObj<typeof PriceTiers>;

export const Default: Story = {
  args: {
    tiers: mockTiers
  }
};

export const WithSelectedTier: Story = {
  args: {
    tiers: mockTiers,
    selectedTier: 'full_lawn'
  }
};

export const WithLotSize: Story = {
  args: {
    tiers: mockTiers,
    lotSizeSqFt: 500
  }
};

export const Interactive: Story = {
  args: {
    tiers: mockTiers,
    lotSizeSqFt: 600,
    selectedTier: 'curb_appeal'
  }
};

export const LargeLot: Story = {
  args: {
    tiers: [
      {
        tier: 'curb_appeal',
        rate: 4.5,
        designFee: 800,
        installationCost: 4500,
        maintenanceMonthly: 400,
        finalEstimate: 5300
      },
      {
        tier: 'full_lawn',
        rate: 8,
        designFee: 1200,
        installationCost: 8000,
        maintenanceMonthly: 600,
        finalEstimate: 9200
      },
      {
        tier: 'dream_lawn',
        rate: 12,
        designFee: 1800,
        installationCost: 12000,
        maintenanceMonthly: 900,
        finalEstimate: 13800
      }
    ],
    lotSizeSqFt: 1000,
    selectedTier: 'dream_lawn'
  }
};

export const EmptyState: Story = {
  args: {
    tiers: []
  }
};

export const Loading: Story = {
  args: {
    isLoading: true
  }
};

export const MobileSwipe: Story = {
  args: {
    tiers: mockTiers,
    selectedTier: 'full_lawn',
    lotSizeSqFt: 600
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    },
    docs: {
      description: {
        story:
          'On mobile devices, users can swipe left and right to navigate between pricing tiers.'
      }
    }
  }
};
