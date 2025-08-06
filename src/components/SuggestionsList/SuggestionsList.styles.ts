import styled from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

export const SuggestionsListStyles = styled.ul.attrs(() => ({
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

export const SuggestionItemStyles = styled.li.attrs(() => ({
  className: 'cursor-pointer select-none relative py-2 pl-3 pr-9'
}))`
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
  }
`;
