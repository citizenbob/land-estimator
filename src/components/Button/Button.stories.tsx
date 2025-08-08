import type { Meta, StoryObj } from '@storybook/react';
import Button from '@components/Button/Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          'The Button component is a styled button for general use with multiple variants, sizes, and states.'
      }
    }
  },
  argTypes: {
    variant: {
      control: {
        type: 'select',
        options: ['primary', 'secondary', 'tertiary']
      }
    },
    size: {
      control: {
        type: 'select',
        options: ['small', 'medium', 'large']
      }
    },
    loading: {
      control: 'boolean'
    },
    disabled: {
      control: 'boolean'
    },
    children: {
      control: 'text'
    }
  }
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Click Me'
  }
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button'
  }
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button'
  }
};

export const Tertiary: Story = {
  args: {
    variant: 'tertiary',
    children: 'Tertiary Button'
  }
};

export const Small: Story = {
  args: {
    size: 'small',
    children: 'Small Button'
  }
};

export const Medium: Story = {
  args: {
    size: 'medium',
    children: 'Medium Button'
  }
};

export const Large: Story = {
  args: {
    size: 'large',
    children: 'Large Button'
  }
};

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading...'
  }
};

export const LoadingPrimary: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Loading Primary'
  }
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button'
  }
};

export const DisabledPrimary: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled Primary'
  }
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
    </div>
  )
};

export const AllSizes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}
    >
      <Button size="small">Small</Button>
      <Button size="medium">Medium</Button>
      <Button size="large">Large</Button>
    </div>
  )
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Button>Normal</Button>
      <Button loading>Loading</Button>
      <Button disabled>Disabled</Button>
    </div>
  )
};
