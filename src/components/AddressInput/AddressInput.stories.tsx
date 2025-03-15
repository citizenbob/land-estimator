'use client';

import type { Meta, StoryObj } from '@storybook/react';
import AddressInput from './AddressInput';

const meta: Meta<typeof AddressInput> = {
  title: 'Components/AddressInput',
  component: AddressInput,
  argTypes: {
    onSubmit: { action: 'submitted' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'The AddressInput component renders a form with an input field and a submit button. It manages its internal state and calls the provided onSubmit callback with the entered address when the form is submitted.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof AddressInput>;

export const Default: Story = {
  args: {
    onSubmit: (address: string) => alert(`Submitted address: ${address}`),
  },
};
