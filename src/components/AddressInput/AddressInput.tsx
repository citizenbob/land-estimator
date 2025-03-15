'use client';

import React, { useState } from 'react';
import { Form, Input, Button } from './AddressInput.styles';

interface AddressInputProps {
  onSubmit: (address: string) => void;
}

const AddressInput: React.FC<AddressInputProps> = ({ onSubmit }) => {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(address);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Input
        type="text"
        placeholder="Enter address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <Button type="submit">Submit</Button>
    </Form>
  );
};

export default AddressInput;
