import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import IconButton from '@components/IconButton/IconButton';

const meta: Meta<typeof IconButton> = {
  title: 'Components/IconButton',
  component: IconButton,
  parameters: {
    docs: {
      description: {
        component: 'The IconButton component is a styled button for icons.'
      }
    }
  }
};

export default meta;

type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
  render: () => <IconButton>×</IconButton>
};

export const WithAriaLabel: Story = {
  render: () => <IconButton aria-label="Close">×</IconButton>
};

export const Disabled: Story = {
  render: () => (
    <IconButton aria-label="Disabled button" disabled>
      ×
    </IconButton>
  )
};
