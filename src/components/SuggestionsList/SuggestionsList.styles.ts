import styled from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

export const SuggestionsListStyles = styled.ul.attrs(() => ({
  className:
    'absolute z-50 w-full shadow-lg max-h-64 overflow-auto py-2 text-sm focus:outline-none'
}))`
  margin-top: calc(
    3rem +
      ${({ theme }) =>
        getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)}
  );
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.background.value',
      tokens.colors.light.background.value
    )};
  border: 1px solid
    ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray200.value',
        tokens.colors.light.gray200.value
      )};
  border-radius: ${({ theme }) =>
    getToken(
      theme,
      'borderRadius.default.value',
      tokens.borderRadius.default.value
    )};

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.background.value',
        tokens.colors.dark.background.value
      )};
    border-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.border.value',
        tokens.colors.dark.border.value
      )};
  }
`;

export const SuggestionItemStyles = styled.li.attrs(() => ({
  className:
    'cursor-pointer select-none relative transition-all duration-200 ease-in-out'
}))`
  padding: ${({ theme }) =>
      getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)}
    ${({ theme }) =>
      getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};
  margin: 0
    ${({ theme }) =>
      getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  border-radius: ${({ theme }) =>
    getToken(
      theme,
      'borderRadius.default.value',
      tokens.borderRadius.default.value
    )};
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};

  &:hover {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.light.hover.value',
        tokens.colors.light.hover.value
      )};
  }

  &:focus {
    background-color: ${({ theme }) =>
      getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
    color: ${({ theme }) =>
      getToken(
        theme,
        'colors.light.reverseText.value',
        tokens.colors.light.reverseText.value
      )};
    outline: none;
  }

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};

    &:hover {
      background-color: ${({ theme }) =>
        getToken(
          theme,
          'colors.dark.hover.value',
          tokens.colors.dark.hover.value
        )};
    }

    &:focus {
      background-color: ${({ theme }) =>
        getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
      color: ${({ theme }) =>
        getToken(
          theme,
          'colors.dark.reverseText.value',
          tokens.colors.dark.reverseText.value
        )};
    }
  }
`;
