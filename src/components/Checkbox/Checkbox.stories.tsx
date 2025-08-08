import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A customizable checkbox component with AirBnB-inspired design. Supports different sizes, variants, and accessibility features.'
      }
    }
  },
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Whether the checkbox is checked'
    },
    onChange: {
      action: 'changed',
      description: 'Callback fired when the checkbox is toggled'
    },
    label: {
      control: 'text',
      description: 'The label text for the checkbox'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant of the checkbox'
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
      description: 'Color variant of the checkbox'
    },
    id: {
      control: 'text',
      description: 'Unique identifier for the checkbox'
    }
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive wrapper component for stories
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CheckboxWrapper = (args: any) => {
  const [checked, setChecked] = useState(args.checked || false);

  return (
    <Checkbox
      label={args.label || 'Checkbox'}
      checked={checked}
      disabled={args.disabled}
      size={args.size}
      variant={args.variant}
      id={args.id}
      onChange={(newChecked) => {
        setChecked(newChecked);
        args.onChange?.(newChecked);
      }}
    />
  );
};

export const Default: Story = {
  render: CheckboxWrapper,
  args: {
    label: 'Default Checkbox',
    checked: false,
    disabled: false,
    size: 'md',
    variant: 'primary'
  }
};

export const Checked: Story = {
  render: CheckboxWrapper,
  args: {
    ...Default.args,
    label: 'Checked Checkbox',
    checked: true
  }
};

export const Disabled: Story = {
  render: CheckboxWrapper,
  args: {
    ...Default.args,
    label: 'Disabled Checkbox',
    disabled: true
  }
};

export const DisabledChecked: Story = {
  render: CheckboxWrapper,
  args: {
    ...Default.args,
    label: 'Disabled Checked Checkbox',
    checked: true,
    disabled: true
  }
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <CheckboxWrapper
        label="Small Checkbox"
        size="sm"
        checked={false}
        onChange={() => {}}
      />
      <CheckboxWrapper
        label="Medium Checkbox (Default)"
        size="md"
        checked={false}
        onChange={() => {}}
      />
      <CheckboxWrapper
        label="Large Checkbox"
        size="lg"
        checked={false}
        onChange={() => {}}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Checkbox components in different sizes: small, medium (default), and large.'
      }
    }
  }
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <CheckboxWrapper
        label="Primary Variant (Default)"
        variant="primary"
        checked={false}
        onChange={() => {}}
      />
      <CheckboxWrapper
        label="Secondary Variant"
        variant="secondary"
        checked={false}
        onChange={() => {}}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Checkbox components with different color variants: primary (default) and secondary.'
      }
    }
  }
};

export const InteractiveGroup: Story = {
  render: () => {
    const [services, setServices] = useState({
      design: false,
      installation: true,
      maintenance: false
    });

    const handleServiceChange = (service: keyof typeof services) => {
      setServices((prev) => ({
        ...prev,
        [service]: !prev[service]
      }));
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3
          style={{
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            fontWeight: '600'
          }}
        >
          Select Services
        </h3>
        <Checkbox
          label="Design"
          checked={services.design}
          onChange={() => handleServiceChange('design')}
          id="service-design"
        />
        <Checkbox
          label="Installation"
          checked={services.installation}
          onChange={() => handleServiceChange('installation')}
          id="service-installation"
        />
        <Checkbox
          label="Maintenance"
          checked={services.maintenance}
          onChange={() => handleServiceChange('maintenance')}
          id="service-maintenance"
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'An interactive group of checkboxes demonstrating real-world usage, similar to a service selection form.'
      }
    }
  }
};

export const Accessibility: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Keyboard Navigation</h4>
        <p
          style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#666' }}
        >
          Use Tab to focus, Space or Enter to toggle
        </p>
        <CheckboxWrapper
          label="Focus me and press Space or Enter"
          checked={false}
          onChange={() => {}}
          id="keyboard-checkbox"
        />
      </div>

      <div>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Screen Reader Support</h4>
        <p
          style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#666' }}
        >
          Proper ARIA attributes and semantic HTML
        </p>
        <CheckboxWrapper
          label="I work great with screen readers"
          checked={false}
          onChange={() => {}}
          id="screen-reader-checkbox"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates accessibility features including keyboard navigation and screen reader support.'
      }
    }
  }
};
