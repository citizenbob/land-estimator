import React from 'react';
import { vi, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as matchers from '@testing-library/jest-dom/matchers';

import InputField from './InputField';
expect.extend(matchers);

describe('InputField Component', () => {
  it('renders correctly with placeholder', () => {
    render(<InputField placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<InputField ref={ref} />);
    expect(ref.current).not.toBeNull();
  });

  it('handles input changes', async () => {
    const handleChange = vi.fn();
    render(<InputField onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Hello');
    expect(handleChange).toHaveBeenCalledTimes(5);
  });
});
