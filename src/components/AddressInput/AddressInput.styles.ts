import styled, { DefaultTheme } from 'styled-components';
import tokens from '@tokens/tokens.json';

const getToken = (
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

export const Form = styled.form.attrs(() => ({
  className: 'relative flex flex-col rounded-md shadow-sm'
}))`
  gap: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  padding: ${({ theme }) =>
    getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};
  border: 1px solid
    ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray200.value',
        tokens.colors.light.gray200.value
      )};
`;
