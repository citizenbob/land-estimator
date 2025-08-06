import { css } from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

/**
 * Helper function to get theme-aware color values with fallbacks
 * @param theme - The styled-components theme object
 * @param lightPath - Token path for light theme (e.g., 'colors.light.text.value')
 * @param darkPath - Token path for dark theme (e.g., 'colors.dark.text.value')
 * @param fallback - Fallback value if token lookup fails
 * @returns Color value string
 */
export const getThemeColor = (
  theme: Record<string, unknown>,
  lightPath: string,
  darkPath?: string,
  fallback?: string
) => {
  const defaultFallback = fallback || tokens.colors.light.text.value;
  return getToken(theme, lightPath, defaultFallback);
};

/**
 * Helper function to get dark theme color with fallback
 * @param theme - The styled-components theme object
 * @param darkPath - Token path for dark theme
 * @param fallback - Fallback value if token lookup fails
 * @returns Color value string
 */
export const getThemeDarkColor = (
  theme: Record<string, unknown>,
  darkPath: string,
  fallback?: string
) => {
  const defaultFallback = fallback || tokens.colors.dark.text.value;
  return getToken(theme, darkPath, defaultFallback);
};

export const responsiveTextColor = css`
  color: ${({ theme }) =>
    getThemeColor(
      theme,
      'colors.light.text.value',
      undefined,
      tokens.colors.light.text.value
    )};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getThemeDarkColor(
        theme,
        'colors.dark.text.value',
        tokens.colors.dark.text.value
      )};
  }
`;

export const responsiveBackgroundColor = css`
  background-color: ${({ theme }) =>
    getThemeColor(
      theme,
      'colors.light.background.value',
      undefined,
      tokens.colors.light.background.value
    )};

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      getThemeDarkColor(
        theme,
        'colors.dark.background.value',
        tokens.colors.dark.background.value
      )};
  }
`;

export const responsiveHoverColor = css`
  &:hover {
    background-color: ${({ theme }) =>
      getThemeColor(
        theme,
        'colors.light.hover.value',
        undefined,
        tokens.colors.light.hover.value
      )};
  }

  @media (prefers-color-scheme: dark) {
    &:hover {
      background-color: ${({ theme }) =>
        getThemeDarkColor(
          theme,
          'colors.dark.hover.value',
          tokens.colors.dark.hover.value
        )};
    }
  }
`;

export const primaryActionStyles = css`
  background-color: ${({ theme }) =>
    getThemeColor(
      theme,
      'colors.primary.value',
      undefined,
      tokens.colors.primary.value
    )};

  &:hover {
    background-color: ${({ theme }) =>
      getThemeColor(
        theme,
        'colors.primaryHover.value',
        undefined,
        tokens.colors.primaryHover.value
      )};
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      getThemeDarkColor(
        theme,
        'colors.dark.primary.value',
        tokens.colors.primary.value
      )};

    &:hover {
      background-color: ${({ theme }) =>
        getThemeDarkColor(
          theme,
          'colors.dark.primaryHover.value',
          tokens.colors.primaryHover.value
        )};
    }
  }
`;

export const focusRingStyles = css`
  &:focus {
    box-shadow: 0 0 0 2px
      ${({ theme }) =>
        getThemeColor(
          theme,
          'colors.primaryHover.value',
          undefined,
          tokens.colors.primaryHover.value
        )};
    border-color: ${({ theme }) =>
      getThemeColor(
        theme,
        'colors.primary.value',
        undefined,
        tokens.colors.primary.value
      )};

    @media (prefers-color-scheme: dark) {
      border-color: ${({ theme }) =>
        getThemeColor(
          theme,
          'colors.primary.value',
          undefined,
          tokens.colors.primary.value
        )};
    }
  }
`;

export const disabledStyles = css`
  &[disabled] {
    background-color: ${({ theme }) =>
      getThemeColor(
        theme,
        'colors.light.gray300.value',
        undefined,
        tokens.colors.light.gray300.value
      )};
    cursor: not-allowed;

    &:hover {
      background-color: ${({ theme }) =>
        getThemeColor(
          theme,
          'colors.light.gray300.value',
          undefined,
          tokens.colors.light.gray300.value
        )};
      cursor: not-allowed;
    }
  }
`;

export const getSemanticColor = (
  colorName: 'success' | 'error' | 'warning' | 'info',
  mode: 'light' | 'dark' = 'light'
) => {
  return (
    (tokens.colors[mode] as Record<string, { value: string }>)[colorName]
      ?.value || tokens.colors[mode].info.value
  );
};

export const getSpacing = (size: 'sm' | 'base' | 'lg' | 'xl') => {
  return tokens.spacing[size]?.value || tokens.spacing.base.value;
};

export const getBorderRadius = (size: 'default' | 'full') => {
  return tokens.borderRadius[size]?.value || tokens.borderRadius.default.value;
};
