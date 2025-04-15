import styled from 'styled-components';
import tokens from '@tokens/tokens.json';

export const IconButtonStyles = styled.button.attrs(() => ({
  className:
    'absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center'
}))`
  background-color: ${({ theme }) =>
    theme.colors?.light?.background?.value ||
    tokens.colors.light.background.value};
  color: ${({ theme }) =>
    theme.colors?.light?.text?.value || tokens.colors.light.text.value};
  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      theme.colors?.dark?.background?.value ||
      tokens.colors.dark.background.value};
    color: ${({ theme }) =>
      theme.colors?.dark?.text?.value || tokens.colors.dark.text.value};
  }
`;
