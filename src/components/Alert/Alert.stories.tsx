import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Alert from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  parameters: {
    docs: {
      description: {
        component:
          'The Alert component displays messages with roles "status" or "alert".'
      }
    }
  }
};

export default meta;

type Story = StoryObj<typeof Alert>;

export const Status: Story = {
  render: () => (
    <Alert role="status" type="info">
      Fetching suggestions...
    </Alert>
  )
};

export const AlertMessage: Story = {
  render: () => (
    <Alert role="alert" type="error">
      Error fetching suggestions
    </Alert>
  )
};

export const Success: Story = {
  args: {
    role: 'status',
    type: 'success',
    children: 'Success! Operation completed.'
  }
};

export const Error: Story = {
  args: {
    role: 'alert',
    type: 'error',
    children: 'Error! Something went wrong.'
  }
};

export const Warning: Story = {
  args: {
    role: 'alert',
    type: 'warning',
    children: 'Warning! Please check your input.'
  }
};

export const Info: Story = {
  args: {
    role: 'alert',
    type: 'info',
    children: 'Info: This is an informational message.'
  }
};
