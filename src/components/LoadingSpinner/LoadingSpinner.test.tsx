import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with default props', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    const customClass = 'custom-spinner';
    render(<LoadingSpinner className={customClass} />);

    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveClass(customClass);
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();

    rerender(<LoadingSpinner size="md" />);
    spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();

    rerender(<LoadingSpinner size="lg" />);
    spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  it('should render with different colors', () => {
    const { rerender } = render(<LoadingSpinner color="primary" />);
    let spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();

    rerender(<LoadingSpinner color="secondary" />);
    spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();

    rerender(<LoadingSpinner color="gray" />);
    spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  it('should use default positioning when no className provided', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveClass(
      'absolute',
      'right-3',
      'top-1/2',
      'transform',
      '-translate-y-1/2'
    );
  });
});
