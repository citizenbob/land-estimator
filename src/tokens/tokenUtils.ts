import { DefaultTheme } from 'styled-components';

/**
 * Safely gets a token value from a styled-components theme
 * Falls back to the provided fallback value if the token doesn't exist
 *
 * @param theme The styled-components theme object
 * @param path Dot-notation path to the desired token value
 * @param fallback Fallback value to use if the token isn't found
 * @returns The token value or fallback
 */
export const getToken = (
  theme: DefaultTheme,
  path: string,
  fallback: string
): string => {
  const keys = path.split('.');
  let result: unknown = theme;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return fallback;
    }
  }
  return typeof result === 'string' ? result : fallback;
};
