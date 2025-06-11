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
  args: {
    role: 'status',
    type: 'info',
    children: 'Fetching suggestions...'
  }
};

export const AlertMessage: Story = {
  args: {
    role: 'alert',
    type: 'error',
    children: 'Error fetching suggestions'
  }
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
