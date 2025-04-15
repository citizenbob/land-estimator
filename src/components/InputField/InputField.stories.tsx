import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import InputField from '@components/InputField/InputField';

const meta: Meta<typeof InputField> = {
  title: 'Components/InputField',
  component: InputField,
  parameters: {
    docs: {
      description: {
        component: 'The InputField component is a styled input element.'
      }
    }
  }
};

export default meta;

type Story = StoryObj<typeof InputField>;

export const Default: Story = {
  render: () => <InputField placeholder="Enter text" />
};

export const WithValue: Story = {
  render: () => <InputField value="Pre-filled value" readOnly />
};

export const Disabled: Story = {
  render: () => <InputField placeholder="Disabled input" disabled />
};
