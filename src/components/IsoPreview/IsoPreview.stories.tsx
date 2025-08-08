import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import IsoPreview from './IsoPreview';

const meta = {
  title: 'Components/IsoPreview',
  component: IsoPreview,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An isometric SVG preview component that displays landscaping tiers with smooth animations. Note: SVG assets may not load in Storybook environment.'
      }
    }
  },
  argTypes: {
    activeTier: {
      control: { type: 'select' },
      options: [null, 'curb_appeal', 'full_lawn', 'dream_lawn'],
      description: 'Currently active landscaping tier'
    },
    useIntersectionObserver: {
      control: { type: 'boolean' },
      description: 'Enable intersection observer for mobile viewport detection'
    },
    animationDuration: {
      control: { type: 'range', min: 100, max: 2000, step: 100 },
      description: 'Duration of drop-in animation in milliseconds'
    }
  },
  decorators: [
    (Story) => (
      <div>
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#f0f8ff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <strong>Note:</strong> SVG assets are loaded from{' '}
          <code>/public/calculator/</code>. If the preview appears empty, check
          the browser console for loading errors. Assets should include:
          empty_lot.svg, house.svg, curb_appeal.svg, full_landscape.svg,
          dream_yards.svg
        </div>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof IsoPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    activeTier: null,
    useIntersectionObserver: false,
    animationDuration: 600
  }
};

export const CurbAppeal: Story = {
  args: {
    activeTier: 'curb_appeal',
    useIntersectionObserver: false,
    animationDuration: 600
  }
};

export const FullLawn: Story = {
  args: {
    activeTier: 'full_lawn',
    useIntersectionObserver: false,
    animationDuration: 600
  }
};

export const DreamYard: Story = {
  args: {
    activeTier: 'dream_lawn',
    useIntersectionObserver: false,
    animationDuration: 600
  }
};

export const FastAnimation: Story = {
  args: {
    activeTier: 'full_lawn',
    useIntersectionObserver: false,
    animationDuration: 200
  }
};

export const SlowAnimation: Story = {
  args: {
    activeTier: 'dream_lawn',
    useIntersectionObserver: false,
    animationDuration: 1200
  }
};

export const Interactive: Story = {
  args: {
    activeTier: 'curb_appeal',
    useIntersectionObserver: false,
    animationDuration: 600
  },
  render: (args) => {
    return (
      <div style={{ width: '500px', height: '500px' }}>
        <IsoPreview {...args} />
      </div>
    );
  }
};

export const DebugVersion: Story = {
  args: {
    activeTier: 'full_lawn',
    useIntersectionObserver: false,
    animationDuration: 600
  },
  render: (args) => {
    return (
      <div style={{ width: '400px' }}>
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        >
          <strong>Debug Info:</strong> Active tier: {args.activeTier || 'none'}
          <br />
          Animation duration: {args.animationDuration}ms
          <br />
          Expected layers: empty_lot.svg,{' '}
          {args.activeTier && `${args.activeTier}.svg, `}house.svg
        </div>
        <IsoPreview {...args} />
      </div>
    );
  }
};

export const WithPlaceholders: Story = {
  args: {
    activeTier: 'full_lawn',
    useIntersectionObserver: false,
    animationDuration: 600
  },
  render: (args) => {
    const MockIsoPreview = () => {
      const tierColors = {
        curb_appeal: '#8B5CF6',
        full_lawn: '#10B981',
        dream_lawn: '#F59E0B'
      };

      const activeTier = args.activeTier;
      const getTiersToShow = () => {
        if (!activeTier) return [];
        const tiers = ['curb_appeal', 'full_lawn', 'dream_lawn'];
        const currentIndex = tiers.indexOf(activeTier);
        return tiers.slice(0, currentIndex + 1);
      };

      const tiersToShow = getTiersToShow();

      return (
        <div
          style={{
            position: 'relative',
            width: '400px',
            aspectRatio: '1 / 1',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            border: '2px solid #e0e7ff',
            overflow: 'hidden'
          }}
        >
          {/* Base layer placeholder */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '10%',
              right: '10%',
              bottom: '10%',
              backgroundColor: '#d1fae5',
              borderRadius: '4px',
              border: '2px dashed #6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#374151'
            }}
          >
            empty_lot.svg
          </div>

          {tiersToShow.map((tier, index) => (
            <div
              key={tier}
              style={{
                position: 'absolute',
                top: `${15 + index * 10}%`,
                left: `${15 + index * 5}%`,
                right: `${15 + index * 5}%`,
                bottom: `${15 + index * 10}%`,
                backgroundColor: tierColors[tier as keyof typeof tierColors],
                borderRadius: '4px',
                opacity: 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                color: 'white',
                fontWeight: 'bold',
                animation: `dropIn ${args.animationDuration}ms ease-out ${index * 100}ms both`,
                zIndex: tier === 'dream_lawn' ? 105 : 140 + index
              }}
            >
              {tier}.svg
            </div>
          ))}

          <div
            style={{
              position: 'absolute',
              top: '5%',
              right: '5%',
              width: '30%',
              height: '30%',
              backgroundColor: '#fbbf24',
              borderRadius: '4px',
              border: '2px solid #d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#92400e',
              fontWeight: 'bold',
              zIndex: 130
            }}
          >
            house.svg
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              right: '8px',
              padding: '4px 8px',
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: '4px',
              fontSize: '11px',
              textAlign: 'center',
              border: '1px solid #d1d5db'
            }}
          >
            Mock Preview - Tier: <strong>{activeTier || 'none'}</strong>
          </div>

          <style>
            {`
              @keyframes dropIn {
                0% {
                  transform: translateY(-100px);
                  opacity: 0;
                }
                100% {
                  transform: translateY(0);
                  opacity: 0.7;
                }
              }
            `}
          </style>
        </div>
      );
    };

    return (
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            Actual Component:
          </h4>
          <IsoPreview {...args} />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            Mock Preview (showing expected structure):
          </h4>
          <MockIsoPreview />
        </div>
      </div>
    );
  }
};

export const WithFallback: Story = {
  args: {
    activeTier: 'dream_lawn',
    useIntersectionObserver: false,
    animationDuration: 600
  },
  render: (args) => {
    return (
      <div style={{ width: '400px' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            border: '2px dashed #ccc',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa'
          }}
        >
          <IsoPreview {...args} />
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              right: '10px',
              padding: '8px',
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: '4px',
              fontSize: '12px',
              textAlign: 'center',
              border: '1px solid #dee2e6'
            }}
          >
            IsoPreview Component
            <br />
            Tier: <strong>{args.activeTier || 'none'}</strong>
          </div>
        </div>
      </div>
    );
  }
};
