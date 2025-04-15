import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Button from '@components/Button/Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'The Button component is a styled button for general use.'
      }
    }
  }
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  render: () => <Button>Click Me</Button>
};

export const Disabled: Story = {
  render: () => (
    <Button disabled aria-label="Disabled button">
      Disabled
    </Button>
  )
};
