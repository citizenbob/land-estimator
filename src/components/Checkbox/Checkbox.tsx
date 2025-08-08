import React, { forwardRef } from 'react';
import {
  CheckboxContainer,
  HiddenInput,
  CheckboxBox,
  CheckboxLabel
} from './Checkbox.styles';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  id?: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked,
      onChange,
      label,
      disabled = false,
      className,
      size = 'md',
      variant = 'primary',
      id,
      onKeyDown
    },
    ref
  ) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled) {
        onChange(event.target.checked);
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      // Call external onKeyDown first (for navigation)
      onKeyDown?.(event);

      // If event wasn't prevented, handle our internal logic
      if (
        !event.defaultPrevented &&
        !disabled &&
        (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter')
      ) {
        event.preventDefault();
        onChange(!checked);
      }
    };

    return (
      <CheckboxContainer className={className}>
        <HiddenInput
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          id={id}
          aria-describedby={id ? `${id}-label` : undefined}
        />
        <CheckboxBox
          $checked={checked}
          $disabled={disabled}
          $size={size}
          $variant={variant}
          aria-hidden="true"
          onClick={() => {
            if (!disabled) {
              onChange(!checked);
            }
          }}
        />
        <CheckboxLabel
          htmlFor={id}
          id={id ? `${id}-label` : undefined}
          $disabled={disabled}
          $size={size}
        >
          {label}
        </CheckboxLabel>
      </CheckboxContainer>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
