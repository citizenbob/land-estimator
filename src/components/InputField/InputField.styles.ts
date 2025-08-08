import styled from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

export const InputFieldStyles = styled.input.attrs(() => ({
  className:
    'w-full px-4 py-3 border rounded-md shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2'
}))`
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.background.value',
      tokens.colors.light.background.value
    )};
  border-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray200.value',
      tokens.colors.light.gray200.value
    )};
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};

  &::placeholder {
    color: ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray500.value',
        tokens.colors.light.gray500.value
      )};
  }

  &:hover {
    border-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray300.value',
        tokens.colors.light.gray300.value
      )};
  }

  &:focus {
    border-color: ${({ theme }) =>
      getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
    box-shadow: 0 0 0 2px
      ${({ theme }) =>
        getToken(theme, 'colors.primary.value', tokens.colors.primary.value)}20;
  }

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
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};

    &::placeholder {
      color: ${({ theme }) =>
        getToken(
          theme,
          'colors.dark.gray500.value',
          tokens.colors.dark.gray500.value
        )};
    }

    &:hover {
      border-color: ${({ theme }) =>
        getToken(
          theme,
          'colors.dark.gray300.value',
          tokens.colors.dark.gray300.value
        )};
    }

    &:focus {
      border-color: ${({ theme }) =>
        getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
      box-shadow: 0 0 0 2px
        ${({ theme }) =>
          getToken(
            theme,
            'colors.primary.value',
            tokens.colors.primary.value
          )}20;
    }
  }
`;
