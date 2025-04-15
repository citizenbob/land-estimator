import React from 'react';
import { vi, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as matchers from '@testing-library/jest-dom/matchers';

import Button from '@components/Button/Button';
expect.extend(matchers);

describe('Button Component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click Me');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const button = screen.getByRole('button');
    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies additional props', () => {
    render(<Button aria-label="Submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Submit');
  });
});
