import React from 'react';
import { vi, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as matchers from '@testing-library/jest-dom/matchers';

import IconButton from './IconButton';
expect.extend(matchers);

describe('IconButton Component', () => {
  it('renders correctly with children', () => {
    render(<IconButton>×</IconButton>);
    expect(screen.getByRole('button')).toHaveTextContent('×');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<IconButton onClick={handleClick}>Click Me</IconButton>);
    const button = screen.getByRole('button');
    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies additional props', () => {
    render(<IconButton aria-label="Close">×</IconButton>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close');
  });
});
