import styled from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

export const ButtonStyles = styled.button.attrs(() => ({
  className:
    'rounded-md px-4 py-2 font-semibold focus:outline-none focus:ring focus:border-primary'
}))`
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) =>
    getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};
  border: none;

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
