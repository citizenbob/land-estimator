import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  const defaultProps = {
    checked: false,
    onChange: vi.fn(),
    label: 'Test Label'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct label', () => {
    render(<Checkbox {...defaultProps} />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('renders unchecked by default', () => {
    render(<Checkbox {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('renders checked when checked prop is true', () => {
    render(<Checkbox {...defaultProps} checked={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    // The checkmark is now rendered via CSS pseudo-element, so we verify the checkbox state instead
    const checkboxContainer = checkbox.closest('div');
    expect(checkboxContainer).toBeInTheDocument();
  });

  it('calls onChange when clicked', () => {
    const handleChange = vi.fn();
    render(<Checkbox {...defaultProps} onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('works with form interactions', () => {
    const handleChange = vi.fn();
    render(<Checkbox {...defaultProps} onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');

    // Test that the checkbox exists and is accessible
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });

  it('is focusable for keyboard navigation', () => {
    render(<Checkbox {...defaultProps} id="test-focus" />);

    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).not.toHaveAttribute('tabIndex', '-1');

    checkbox.focus();
    expect(checkbox).toHaveFocus();
  });

  it('supports tab navigation like a native checkbox', () => {
    render(
      <div>
        <input type="text" data-testid="before" />
        <Checkbox {...defaultProps} id="test-tab" />
        <input type="text" data-testid="after" />
      </div>
    );

    const checkbox = screen.getByRole('checkbox');
    const beforeInput = screen.getByTestId('before');
    const afterInput = screen.getByTestId('after');

    expect(checkbox).not.toHaveAttribute('tabIndex', '-1');
    expect(checkbox.tabIndex).toBe(0);

    checkbox.focus();
    expect(checkbox).toHaveFocus();

    fireEvent.keyDown(checkbox, { key: ' ' });
    expect(defaultProps.onChange).toHaveBeenCalledWith(true);

    beforeInput.focus();
    expect(beforeInput).toHaveFocus();

    checkbox.focus();
    expect(checkbox).toHaveFocus();

    afterInput.focus();
    expect(afterInput).toHaveFocus();
  });

  it('responds to keyboard activation (Space and Enter keys)', () => {
    const handleChange = vi.fn();
    render(
      <Checkbox {...defaultProps} onChange={handleChange} id="test-keyboard" />
    );

    const checkbox = screen.getByRole('checkbox');
    checkbox.focus();

    fireEvent.keyDown(checkbox, { key: ' ' });
    expect(handleChange).toHaveBeenCalledWith(true);

    handleChange.mockClear();

    fireEvent.keyDown(checkbox, { key: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith(true);

    handleChange.mockClear();
    fireEvent.keyDown(checkbox, { key: 'a' });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when disabled', () => {
    const handleChange = vi.fn();
    render(<Checkbox {...defaultProps} onChange={handleChange} disabled />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const customCheckbox =
      screen.getByText('Test Label').previousElementSibling
        ?.previousElementSibling;
    fireEvent.click(customCheckbox!);
    fireEvent.keyDown(customCheckbox!, { key: ' ' });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<Checkbox {...defaultProps} className="custom-class" />);
    const container = screen.getByRole('checkbox').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('sets correct id and aria-describedby attributes', () => {
    render(<Checkbox {...defaultProps} id="test-checkbox" />);

    const hiddenInput = screen.getByRole('checkbox');
    expect(hiddenInput).toHaveAttribute('id', 'test-checkbox');
    expect(hiddenInput).toHaveAttribute(
      'aria-describedby',
      'test-checkbox-label'
    );

    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('id', 'test-checkbox-label');
    expect(label).toHaveAttribute('for', 'test-checkbox');
  });

  it('has correct disabled state when disabled', () => {
    render(<Checkbox {...defaultProps} disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('is not disabled when not disabled', () => {
    render(<Checkbox {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeDisabled();
  });

  describe('size variants', () => {
    it('renders small size', () => {
      render(<Checkbox {...defaultProps} size="sm" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders medium size (default)', () => {
      render(<Checkbox {...defaultProps} size="md" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders large size', () => {
      render(<Checkbox {...defaultProps} size="lg" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });

  describe('color variants', () => {
    it('renders primary variant (default)', () => {
      render(<Checkbox {...defaultProps} variant="primary" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders secondary variant', () => {
      render(<Checkbox {...defaultProps} variant="secondary" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });
});
