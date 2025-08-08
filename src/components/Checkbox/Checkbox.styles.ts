import styled from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

interface CheckboxBoxProps {
  $checked: boolean;
  $disabled: boolean;
  $size: 'sm' | 'md' | 'lg';
  $variant: 'primary' | 'secondary';
}

interface CheckboxLabelProps {
  $disabled: boolean;
  $size: 'sm' | 'md' | 'lg';
}

const getSizeProps = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return {
        boxSize: '1rem',
        fontSize: '0.875rem',
        checkSize: '0.625rem'
      };
    case 'lg':
      return {
        boxSize: '1.5rem',
        fontSize: '1.125rem',
        checkSize: '1rem'
      };
    default:
      // md
      return {
        boxSize: '1.25rem',
        fontSize: '1rem',
        checkSize: '0.75rem'
      };
  }
};

export const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  cursor: pointer;
  position: relative;

  &:hover {
    opacity: 0.8;
  }

  &:focus-within {
    outline: 2px solid
      ${({ theme }) =>
        getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
    outline-offset: 2px;
    border-radius: ${({ theme }) =>
      getToken(
        theme,
        'borderRadius.default.value',
        tokens.borderRadius.default.value
      )};
  }
`;

export const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: inherit;
  z-index: 1;

  /* Keep it focusable and ensure it receives focus outline */
  &:focus + div {
    outline: 2px solid
      ${({ theme }) =>
        getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
    outline-offset: 2px;
    border-radius: ${({ theme }) =>
      getToken(
        theme,
        'borderRadius.default.value',
        tokens.borderRadius.default.value
      )};
  }
`;
export const CheckboxBox = styled.div<CheckboxBoxProps>`
  width: ${({ $size }) => getSizeProps($size).boxSize};
  height: ${({ $size }) => getSizeProps($size).boxSize};
  border: 2px solid;
  border-radius: ${({ theme }) =>
    getToken(
      theme,
      'borderRadius.default.value',
      tokens.borderRadius.default.value
    )};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};

  /* Border and background colors */
  border-color: ${({ $checked, $disabled, $variant, theme }) => {
    if ($disabled) {
      return getToken(
        theme,
        'colors.light.gray300.value',
        tokens.colors.light.gray300.value
      );
    }
    if ($checked) {
      return $variant === 'primary'
        ? getToken(theme, 'colors.primary.value', tokens.colors.primary.value)
        : getToken(
            theme,
            'colors.secondary.value',
            tokens.colors.secondary.value
          );
    }
    return getToken(
      theme,
      'colors.light.gray400.value',
      tokens.colors.light.gray400.value
    );
  }};

  background-color: ${({ $checked, $disabled, $variant, theme }) => {
    if ($disabled) {
      return getToken(
        theme,
        'colors.light.gray100.value',
        tokens.colors.light.gray100.value
      );
    }
    if ($checked) {
      return $variant === 'primary'
        ? getToken(theme, 'colors.primary.value', tokens.colors.primary.value)
        : getToken(
            theme,
            'colors.secondary.value',
            tokens.colors.secondary.value
          );
    }
    return getToken(
      theme,
      'colors.light.background.value',
      tokens.colors.light.background.value
    );
  }};

  /* Checkmark styling using pseudo-element */
  &::after {
    content: ${({ $checked }) => ($checked ? '"✓"' : '""')};
    color: ${({ theme }) =>
      getToken(
        theme,
        'colors.light.background.value',
        tokens.colors.light.background.value
      )};
    font-size: ${({ $size }) => getSizeProps($size).checkSize};
    font-weight: bold;
    line-height: 1;
    display: ${({ $checked }) => ($checked ? 'block' : 'none')};
  }

  /* Hover effects */
  &:hover {
    ${({ $disabled, $checked, $variant, theme }) =>
      !$disabled &&
      !$checked &&
      `
      border-color: ${
        $variant === 'primary'
          ? getToken(theme, 'colors.primary.value', tokens.colors.primary.value)
          : getToken(
              theme,
              'colors.secondary.value',
              tokens.colors.secondary.value
            )
      };
      background-color: ${getToken(
        theme,
        'colors.light.hover.value',
        tokens.colors.light.hover.value
      )};
    `}
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    border-color: ${({ $checked, $disabled, $variant, theme }) => {
      if ($disabled) {
        return getToken(
          theme,
          'colors.dark.gray300.value',
          tokens.colors.dark.gray300.value
        );
      }
      if ($checked) {
        return $variant === 'primary'
          ? getToken(theme, 'colors.primary.value', tokens.colors.primary.value)
          : getToken(
              theme,
              'colors.secondary.value',
              tokens.colors.secondary.value
            );
      }
      return getToken(
        theme,
        'colors.dark.gray400.value',
        tokens.colors.dark.gray400.value
      );
    }};

    background-color: ${({ $checked, $disabled, $variant, theme }) => {
      if ($disabled) {
        return getToken(
          theme,
          'colors.dark.gray100.value',
          tokens.colors.dark.gray100.value
        );
      }
      if ($checked) {
        return $variant === 'primary'
          ? getToken(theme, 'colors.primary.value', tokens.colors.primary.value)
          : getToken(
              theme,
              'colors.secondary.value',
              tokens.colors.secondary.value
            );
      }
      return getToken(
        theme,
        'colors.dark.background.value',
        tokens.colors.dark.background.value
      );
    }};

    &::after {
      color: ${({ theme }) =>
        getToken(
          theme,
          'colors.dark.background.value',
          tokens.colors.dark.background.value
        )};
    }

    &:hover {
      ${({ $disabled, $checked, theme }) =>
        !$disabled &&
        !$checked &&
        `
        background-color: ${getToken(
          theme,
          'colors.dark.hover.value',
          tokens.colors.dark.hover.value
        )};
      `}
    }
  }
`;

export const CheckboxLabel = styled.label<CheckboxLabelProps>`
  font-size: ${({ $size }) => getSizeProps($size).fontSize};
  font-weight: 500;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  color: ${({ $disabled, theme }) =>
    $disabled
      ? getToken(
          theme,
          'colors.light.gray400.value',
          tokens.colors.light.gray400.value
        )
      : getToken(
          theme,
          'colors.light.text.value',
          tokens.colors.light.text.value
        )};
  line-height: 1.5;
  user-select: none;

  @media (prefers-color-scheme: dark) {
    color: ${({ $disabled, theme }) =>
      $disabled
        ? getToken(
            theme,
            'colors.dark.gray400.value',
            tokens.colors.dark.gray400.value
          )
        : getToken(
            theme,
            'colors.dark.text.value',
            tokens.colors.dark.text.value
          )};
  }
`;
