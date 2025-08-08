import type { Meta, StoryObj } from '@storybook/react';
import Icon, { IconName } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'Components/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A versatile icon component with predefined SVG icons and customizable size and color variants.'
      }
    }
  },
  argTypes: {
    name: {
      control: { type: 'select' },
      options: [
        'vercel',
        'file',
        'window',
        'globe',
        'education',
        'leaf',
        'github',
        'lock'
      ],
      description: 'The icon to display'
    },
    width: {
      control: { type: 'number' },
      description: 'Width of the icon in pixels'
    },
    height: {
      control: { type: 'number' },
      description: 'Height of the icon in pixels'
    },
    color: {
      control: { type: 'color' },
      description: 'Custom color for the icon'
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes'
    }
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'file'
  }
};

export const Vercel: Story = {
  args: {
    name: 'vercel'
  }
};

export const GitHub: Story = {
  args: {
    name: 'github'
  }
};

export const Globe: Story = {
  args: {
    name: 'globe'
  }
};

export const Leaf: Story = {
  args: {
    name: 'leaf'
  }
};

export const Lock: Story = {
  args: {
    name: 'lock'
  }
};

export const Education: Story = {
  args: {
    name: 'education'
  }
};

export const Window: Story = {
  args: {
    name: 'window'
  }
};

export const CustomSize: Story = {
  args: {
    name: 'github',
    width: 48,
    height: 48
  }
};

export const CustomColor: Story = {
  args: {
    name: 'leaf',
    color: '#00a897'
  }
};

export const AllIcons: Story = {
  render: () => {
    const iconNames: IconName[] = [
      'vercel',
      'file',
      'window',
      'globe',
      'education',
      'leaf',
      'github',
      'lock'
    ];

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2rem',
          alignItems: 'center'
        }}
      >
        {iconNames.map((name) => (
          <div
            key={name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Icon name={name} width={32} height={32} />
            <span style={{ fontSize: '12px', textAlign: 'center' }}>
              {name}
            </span>
          </div>
        ))}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Showcase of all available icons in the icon library.'
      }
    }
  }
};

export const Sizes: Story = {
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
        <Icon name="github" width={12} height={12} />
        <span style={{ fontSize: '10px' }}>12px</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <Icon name="github" width={16} height={16} />
        <span style={{ fontSize: '10px' }}>16px</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <Icon name="github" width={24} height={24} />
        <span style={{ fontSize: '10px' }}>24px</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <Icon name="github" width={32} height={32} />
        <span style={{ fontSize: '10px' }}>32px</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <Icon name="github" width={48} height={48} />
        <span style={{ fontSize: '10px' }}>48px</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different sizes of the same icon.'
      }
    }
  }
};

export const Colors: Story = {
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
        <Icon name="leaf" width={32} height={32} color="#00a897" />
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
        <Icon name="leaf" width={32} height={32} color="#6366f1" />
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
        <Icon name="leaf" width={32} height={32} color="#ef4444" />
        <span style={{ fontSize: '12px' }}>Error</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <Icon name="leaf" width={32} height={32} color="#6b7280" />
        <span style={{ fontSize: '12px' }}>Muted</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different color variants of the same icon.'
      }
    }
  }
};

export const InText: Story = {
  render: () => (
    <div style={{ fontSize: '16px', lineHeight: '1.5' }}>
      <p>
        This is a paragraph with inline icons like{' '}
        <span style={{ verticalAlign: 'middle', display: 'inline-flex' }}>
          <Icon name="github" width={16} height={16} />
        </span>{' '}
        GitHub,{' '}
        <span style={{ verticalAlign: 'middle', display: 'inline-flex' }}>
          <Icon name="vercel" width={16} height={16} />
        </span>{' '}
        Vercel, and{' '}
        <span style={{ verticalAlign: 'middle', display: 'inline-flex' }}>
          <Icon name="globe" width={16} height={16} />
        </span>{' '}
        Globe icons embedded within the text.
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of icons used inline within text content.'
      }
    }
  }
};
