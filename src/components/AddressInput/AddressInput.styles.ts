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
      getToken(theme, 'colors.gray200.value', tokens.colors.gray200.value)};
`;

export const Input = styled.input.attrs(() => ({
  className:
    'w-full rounded-md focus:outline-none focus:ring focus:border-primary'
}))`
  padding: 0.75rem;
  border: 1px solid
    ${({ theme }) =>
      getToken(theme, 'colors.gray300.value', tokens.colors.gray300.value)};
  &:focus {
    box-shadow: 0 0 0 2px
      ${({ theme }) =>
        getToken(
          theme,
          'colors.primaryHover.value',
          tokens.colors.primaryHover.value
        )};
    border-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.primaryHover.value',
        tokens.colors.primaryHover.value
      )};
  }
`;

export const IconButton = styled.button.attrs(() => ({
  className:
    'absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center'
}))`
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

export const Button = styled.button.attrs(() => ({
  className: 'rounded-md transition-colors'
}))`
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) =>
    getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
  color: white;
  border: none;
  &:hover {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.primaryHover.value',
        tokens.colors.primaryHover.value
      )};
  }
`;

export const SuggestionsList = styled.ul.attrs(() => ({
  className:
    'absolute z-10 w-full mt-12 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm'
}))`
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

export const SuggestionItem = styled.li.attrs(() => ({
  className: 'cursor-pointer select-none relative py-2 pl-3 pr-9'
}))`
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
