import type { Meta, StoryObj } from '@storybook/react';
import { EstimateLineItem } from './EstimateLineItem';

const meta: Meta<typeof EstimateLineItem> = {
  title: 'Components/EstimateLineItem',
  component: EstimateLineItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A reusable component for displaying estimate breakdown line items with consistent animation and styling.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'The label text for the line item'
    },
    value: {
      control: 'text',
      description: 'The value text for the line item'
    },
    show: {
      control: 'boolean',
      description: 'Whether to show the line item'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default line item with basic label and value
 */
export const Default: Story = {
  args: {
    label: 'Design Fee',
    value: '$1,500',
    show: true
  }
};

export const LotSize: Story = {
  args: {
    label: 'Lot Size',
    value: '8,500 sq ft',
    show: true
  }
};

export const InstallationCost: Story = {
  args: {
    label: 'Installation',
    value: '$8,500 - $12,750',
    show: true
  }
};

export const MaintenanceCost: Story = {
  args: {
    label: 'Maintenance',
    value: '$200/month',
    show: true
  }
};

export const TotalEstimate: Story = {
  args: {
    label: 'Total Estimate',
    value: '$10,000 - $15,000',
    show: true
  }
};

/**
 * Line item with longer labels and values
 */
export const LongContent: Story = {
  args: {
    label: 'Premium Landscape Design with Custom Features',
    value: '$15,000 - $25,000 (includes consultation)',
    show: true
  }
};

/**
 * Hidden line item (should not render)
 */
export const Hidden: Story = {
  args: {
    label: 'Hidden Item',
    value: '$0',
    show: false
  }
};

/**
 * Multiple line items shown together
 */
export const MultipleItems: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <EstimateLineItem label="Lot Size" value="8,500 sq ft" />
      <EstimateLineItem label="Design" value="$1,500" />
      <EstimateLineItem label="Installation" value="$8,500 - $12,750" />
      <EstimateLineItem label="Maintenance" value="$200/month" />
      <EstimateLineItem label="Total Estimate" value="$10,000 - $15,000" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Example of multiple EstimateLineItem components displayed together as they would appear in an estimate breakdown.'
      }
    }
  }
};

/**
 * Mixed visibility items
 */
export const MixedVisibility: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <EstimateLineItem label="Lot Size" value="8,500 sq ft" show={true} />
      <EstimateLineItem label="Design" value="$1,500" show={false} />
      <EstimateLineItem
        label="Installation"
        value="$8,500 - $12,750"
        show={true}
      />
      <EstimateLineItem label="Maintenance" value="$200/month" show={false} />
      <EstimateLineItem
        label="Total Estimate"
        value="$8,500 - $12,750"
        show={true}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Example showing how the show prop controls visibility. Only items with show=true are rendered.'
      }
    }
  }
};

/**
 * Empty/zero values
 */
export const EmptyValues: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <EstimateLineItem label="No Design" value="$0" />
      <EstimateLineItem label="Basic Package" value="Included" />
      <EstimateLineItem label="Consultation" value="Free" />
      <EstimateLineItem label="Additional Services" value="N/A" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Examples of line items with zero values, free services, or non-applicable items.'
      }
    }
  }
};
