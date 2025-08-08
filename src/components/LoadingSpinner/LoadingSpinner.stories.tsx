import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from './LoadingSpinner';

const meta: Meta<typeof LoadingSpinner> = {
  title: 'Components/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A customizable loading spinner with size and color variants, animated with Framer Motion.'
      }
    }
  },
  argTypes: {
    size: {
      control: { type: 'radio' },
      options: ['sm', 'md', 'lg'],
      description: 'Size of the spinner'
    },
    color: {
      control: { type: 'radio' },
      options: ['primary', 'secondary', 'gray'],
      description: 'Color variant of the spinner'
    },
    className: {
      control: { type: 'text' },
      description: 'Custom CSS classes to apply'
    }
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'sm',
    color: 'primary'
  }
};

export const Small: Story = {
  args: {
    size: 'sm',
    color: 'primary'
  }
};

export const Medium: Story = {
  args: {
    size: 'md',
    color: 'primary'
  }
};

export const Large: Story = {
  args: {
    size: 'lg',
    color: 'primary'
  }
};

export const Primary: Story = {
  args: {
    size: 'md',
    color: 'primary'
  }
};

export const Secondary: Story = {
  args: {
    size: 'md',
    color: 'secondary'
  }
};

export const Gray: Story = {
  args: {
    size: 'md',
    color: 'gray'
  }
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <LoadingSpinner size="sm" color="primary" className="relative" />
        <span style={{ fontSize: '12px' }}>Small</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <LoadingSpinner size="md" color="primary" className="relative" />
        <span style={{ fontSize: '12px' }}>Medium</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <LoadingSpinner size="lg" color="primary" className="relative" />
        <span style={{ fontSize: '12px' }}>Large</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of all available sizes.'
      }
    }
  }
};

export const AllColors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <LoadingSpinner size="md" color="primary" className="relative" />
        <span style={{ fontSize: '12px' }}>Primary</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <LoadingSpinner size="md" color="secondary" className="relative" />
        <span style={{ fontSize: '12px' }}>Secondary</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <LoadingSpinner size="md" color="gray" className="relative" />
        <span style={{ fontSize: '12px' }}>Gray</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of all available color variants.'
      }
    }
  }
};

export const InInputField: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '300px' }}>
      <input
        type="text"
        placeholder="Search address..."
        style={{
          width: '100%',
          padding: '0.75rem 3rem 0.75rem 1rem',
          border: '1px solid #d1d5db',
          borderRadius: '0.375rem',
          fontSize: '1rem'
        }}
      />
      <LoadingSpinner size="sm" color="primary" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Example of how the spinner appears in an input field with default positioning.'
      }
    }
  }
};

export const CustomPositioning: Story = {
  render: () => (
    <div
      style={{
        position: 'relative',
        width: '200px',
        height: '100px',
        border: '1px dashed #ccc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <LoadingSpinner size="md" color="primary" className="relative" />
      <span style={{ marginLeft: '1rem' }}>Loading...</span>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example with custom positioning using className override.'
      }
    }
  }
};
