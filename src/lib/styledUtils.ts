import { css } from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

/**
 * Shared utility for generating responsive text color styles
 * that adapt to light/dark themes using prefers-color-scheme
 */
export const responsiveTextColor = css`
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
  }
`;

/**
 * Shared utility for generating responsive background color styles
 * that adapt to light/dark themes using prefers-color-scheme
 */
export const responsiveBackgroundColor = css`
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.background.value',
      tokens.colors.light.background.value
    )};

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.background.value',
        tokens.colors.dark.background.value
      )};
  }
`;

/**
 * Shared utility for generating responsive hover background color styles
 * that adapt to light/dark themes using prefers-color-scheme
 */
export const responsiveHoverColor = css`
  &:hover {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.light.hover.value',
        tokens.colors.light.hover.value
      )};
  }

  @media (prefers-color-scheme: dark) {
    &:hover {
      background-color: ${({ theme }) =>
        getToken(
          theme,
          'colors.dark.hover.value',
          tokens.colors.dark.hover.value
        )};
    }
  }
`;

/**
 * Shared utility for generating primary action styles (buttons, links, etc.)
 */
export const primaryActionStyles = css`
  background-color: ${({ theme }) =>
    getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};

  &:hover {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.primaryHover.value',
        tokens.colors.primaryHover.value
      )};
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.primary.value',
        tokens.colors.primary.value
      )};

    &:hover {
      background-color: ${({ theme }) =>
        getToken(
          theme,
          'colors.dark.primaryHover.value',
          tokens.colors.primaryHover.value
        )};
    }
  }
`;

/**
 * Shared utility for generating focus ring styles
 */
export const focusRingStyles = css`
  &:focus {
    box-shadow: 0 0 0 2px
      ${({ theme }) =>
        getToken(
          theme,
          'colors.primaryHover.value',
          tokens.colors.primaryHover.value
        )};
    border-color: ${({ theme }) =>
      getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};

    @media (prefers-color-scheme: dark) {
      border-color: ${({ theme }) =>
        getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
    }
  }
`;

/**
 * Shared utility for generating disabled state styles
 */
export const disabledStyles = css`
  &[disabled] {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray300.value',
        tokens.colors.light.gray300.value
      )};
    cursor: not-allowed;

    &:hover {
      background-color: ${({ theme }) =>
        getToken(
          theme,
          'colors.light.gray300.value',
          tokens.colors.light.gray300.value
        )};
      cursor: not-allowed;
    }
  }
`;

/**
 * Helper function to get semantic color token value safely
 */
export const getSemanticColor = (
  colorName: 'success' | 'error' | 'warning' | 'info',
  mode: 'light' | 'dark' = 'light'
) => {
  return (
    (tokens.colors[mode] as Record<string, { value: string }>)[colorName]
      ?.value || tokens.colors[mode].info.value
  );
};

/**
 * Helper function to get spacing token value safely
 */
export const getSpacing = (size: 'sm' | 'base' | 'lg' | 'xl') => {
  return tokens.spacing[size]?.value || tokens.spacing.base.value;
};

/**
 * Helper function to get border radius token value safely
 */
export const getBorderRadius = (size: 'default' | 'full') => {
  return tokens.borderRadius[size]?.value || tokens.borderRadius.default.value;
};
